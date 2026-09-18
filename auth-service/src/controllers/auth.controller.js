const grpc = require("@grpc/grpc-js");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { registerSchema, loginSchema } = require("../valid/auth.validator");
const publishUserRegistered =
    require("../events/userRegistered.publisher");

const User = require("../models/User");
const RefreshSession = require("../models/refreshSession");
const {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    hashToken
} = require("../utils/token");

function emptyAuthResponse(message) {
    return {
        success: false,
        message,
        token: "",
        accessToken: "",
        refreshToken: ""
    };
}

function authResponse(message, accessToken, refreshToken) {
    return {
        success: true,
        message,
        // Keep the original field as a deliberate compatibility alias.
        token: accessToken,
        accessToken,
        refreshToken
    };
}

async function createSessionTokens(user) {
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    const decoded = verifyRefreshToken(refreshToken);

    await RefreshSession.create({
        userId: user._id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000)
    });

    return { accessToken, refreshToken };
}

async function register(call, callback) {
    try {
        const result = registerSchema.safeParse(call.request);

        if (!result.success) {
            return callback(null, emptyAuthResponse(result.error.issues[0].message));
        }

        const {
            username,
            email,
            password
        } = result.data;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return callback(null, emptyAuthResponse("User already exists"));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });
        await publishUserRegistered(user);
        const { accessToken, refreshToken } = await createSessionTokens(user);

        callback(null, authResponse(
            "User registered successfully",
            accessToken,
            refreshToken
        ));

    } catch (error) {
        if (error?.code === 11000) {
            return callback(null, emptyAuthResponse("User already exists"));
        }

        console.error("Register error:", error.message);

        callback({
            code: grpc.status.INTERNAL,
            message: "Internal server error"
        });
    }
}

async function login(call, callback) {
    try {
        const result = loginSchema.safeParse(call.request);

        if (!result.success) {
            return callback(null, emptyAuthResponse(result.error.issues[0].message));
        }
        const { email, password } = result.data;

        const user = await User.findOne({ email });

        if (!user) {
            return callback(null, emptyAuthResponse("Invalid email or password"));
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return callback(null, emptyAuthResponse("Invalid email or password"));
        }

        const { accessToken, refreshToken } = await createSessionTokens(user);

        callback(null, authResponse(
            "Login successful",
            accessToken,
            refreshToken
        ));

    } catch (error) {
        console.error("Login error:", error.message);

        callback({
            code: grpc.status.INTERNAL,
            message: "Internal server error"
        });
    }
}

function verifyToken(call, callback) {
    const { token } = call.request;

    try {
        const decoded = verifyAccessToken(token);

        callback(null, {
            valid: true,
            message: "Token is valid",
            userId: decoded.userId,
            email: decoded.email
        });

    } catch (error) {
        callback(null, {
            valid: false,
            message: "Invalid or expired token",
            userId: "",
            email: ""
        });
    }
}

async function refreshToken(call, callback) {
    const rawToken = call.request.refreshToken;

    if (!rawToken) {
        return callback(null, emptyAuthResponse("Invalid or expired refresh token"));
    }

    let decoded;
    try {
        decoded = verifyRefreshToken(rawToken);
    } catch {
        return callback(null, emptyAuthResponse("Invalid or expired refresh token"));
    }

    try {
        const tokenHash = hashToken(rawToken);
        const now = new Date();

        // This conditional update is the rotation lock: only one concurrent
        // request can claim an active refresh session.
        const claimedSession = await RefreshSession.findOneAndUpdate(
            {
                tokenHash,
                userId: decoded.userId,
                revokedAt: null,
                expiresAt: { $gt: now }
            },
            { $set: { revokedAt: now } },
            { new: true }
        );

        if (!claimedSession) {
            const usedSession = await RefreshSession.findOne({ tokenHash });

            if (usedSession?.revokedAt) {
                await RefreshSession.updateOne(
                    { _id: usedSession._id, reuseDetectedAt: null },
                    { $set: { reuseDetectedAt: now } }
                );
                await RefreshSession.updateMany(
                    { userId: usedSession.userId, revokedAt: null },
                    { $set: { revokedAt: now } }
                );
            }

            return callback(null, emptyAuthResponse("Invalid or expired refresh token"));
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return callback(null, emptyAuthResponse("Invalid or expired refresh token"));
        }

        const accessToken = createAccessToken(user);
        const newRefreshToken = createRefreshToken(user);
        const newDecoded = verifyRefreshToken(newRefreshToken);
        const newTokenHash = hashToken(newRefreshToken);

        await RefreshSession.create({
            userId: user._id,
            tokenHash: newTokenHash,
            expiresAt: new Date(newDecoded.exp * 1000)
        });
        await RefreshSession.updateOne(
            { _id: claimedSession._id },
            { $set: { replacedByTokenHash: newTokenHash } }
        );

        // If a concurrent reuse was detected while the replacement was being
        // created, fail closed and revoke the newly-created session as well.
        const rotationState = await RefreshSession.findById(claimedSession._id);
        if (rotationState?.reuseDetectedAt) {
            await RefreshSession.updateMany(
                { userId: user._id, revokedAt: null },
                { $set: { revokedAt: new Date() } }
            );
            return callback(null, emptyAuthResponse("Invalid or expired refresh token"));
        }

        return callback(null, authResponse(
            "Token refreshed successfully",
            accessToken,
            newRefreshToken
        ));
    } catch (error) {
        console.error("Refresh token error:", error.message);
        return callback({
            code: grpc.status.INTERNAL,
            message: "Internal server error"
        });
    }
}

async function logout(call, callback) {
    const rawToken = call.request.refreshToken;

    if (!rawToken) {
        return callback(null, {
            success: false,
            message: "Refresh token is required"
        });
    }

    try {
        await RefreshSession.updateOne(
            { tokenHash: hashToken(rawToken), revokedAt: null },
            { $set: { revokedAt: new Date() } }
        );

        // Deliberately idempotent: do not reveal whether a session existed.
        return callback(null, {
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error.message);
        return callback({
            code: grpc.status.INTERNAL,
            message: "Internal server error"
        });
    }
}

async function logoutAll(call, callback) {
    const { userId } = call.request;

    if (!mongoose.isValidObjectId(userId)) {
        return callback(null, {
            success: false,
            message: "Authentication required"
        });
    }

    try {
        await RefreshSession.updateMany(
            { userId, revokedAt: null },
            { $set: { revokedAt: new Date() } }
        );

        return callback(null, {
            success: true,
            message: "Logged out from all devices"
        });
    } catch (error) {
        console.error("Logout-all error:", error.message);
        return callback({
            code: grpc.status.INTERNAL,
            message: "Internal server error"
        });
    }
}

module.exports = {
    register,
    login,
    verifyToken,
    refreshToken,
    logout,
    logoutAll
};
