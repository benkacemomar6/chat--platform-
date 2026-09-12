const grpc = require("@grpc/grpc-js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {registerSchema, loginSchema}=require("../valid/auth.validator")
const publishUserRegistered =
    require("../events/userRegistered.publisher");

const User = require("../models/User");

async function register(call, callback) {
    try {
          const result = registerSchema.safeParse(call.request);

        if (!result.success) {
            return callback(null, {
                success: false,
                message: result.error.issues[0].message,
                token: ""
            });
        }

        const {
            username,
            email,
            password
        } = result.data;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return callback(null, {
                success: false,
                message: "User already exists",
                token: ""
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });
        await publishUserRegistered(user);


        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        callback(null, {
            success: true,
            message: "User registered successfully",
            token
        });

    } catch (error) {
        console.error("Register error:", error);

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
    return callback(null, {
        success: false,
        message: result.error.issues[0].message,
        token: ""
    });
}
const { email, password } = result.data;

        const user = await User.findOne({ email });

        if (!user) {
            return callback(null, {
                success: false,
                message: "Invalid email or password",
                token: ""
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return callback(null, {
                success: false,
                message: "Invalid email or password",
                token: ""
            });
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        callback(null, {
            success: true,
            message: "Login successful",
            token
        });

    } catch (error) {
        console.error("Login error:", error);

        callback({
            code: grpc.status.INTERNAL,
            message: "Internal server error"
        });
    }
}

function verifyToken(call, callback) {
    const { token } = call.request;

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

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

module.exports = {
    register,
    login,
    verifyToken
};