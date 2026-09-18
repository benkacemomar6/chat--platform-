const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_TOKEN_LIFETIME = "15m";
const REFRESH_TOKEN_LIFETIME = "7d";

function createAccessToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email,
            type: "access"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: ACCESS_TOKEN_LIFETIME,
            algorithm: "HS256"
        }
    );
}

function createRefreshToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            type: "refresh"
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: REFRESH_TOKEN_LIFETIME,
            algorithm: "HS256",
            jwtid: crypto.randomUUID()
        }
    );
}

function verifyAccessToken(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"]
    });

    if (decoded.type !== "access") {
        throw new Error("Invalid access token type");
    }

    return decoded;
}

function verifyRefreshToken(token) {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        algorithms: ["HS256"]
    });

    if (decoded.type !== "refresh") {
        throw new Error("Invalid refresh token type");
    }

    return decoded;
}

// Refresh tokens are high-entropy values, so a deterministic SHA-256 digest
// supports indexed lookup without storing the usable raw credential.
function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    hashToken,
    ACCESS_TOKEN_LIFETIME,
    REFRESH_TOKEN_LIFETIME
};
