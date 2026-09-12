const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const userClient = require("../grpc/user.client");
const grpc = require("@grpc/grpc-js");
const router = express.Router();




router.get("/me", authMiddleware, (req, res) => {
    const userId = req.user.userId;

    userClient.getProfile(
        { userId },
        (error, response) => {
            if (error) {
                console.error("GetProfile gRPC error:", error.message);

                if (error.code === grpc.status.INVALID_ARGUMENT) {
                    return res.status(400).json({
                        message: error.details
                    });
                }

                if (error.code === grpc.status.NOT_FOUND) {
                    return res.status(404).json({
                        message: error.details
                    });
                }

                if (error.code === grpc.status.UNAVAILABLE) {
                    return res.status(503).json({
                        message: "User service unavailable"
                    });
                }

                return res.status(500).json({
                    message: "Internal server error"
                });
            }

            res.json(response);
        }
    );
});
router.patch("/me", authMiddleware, (req, res) => {
    const userId = req.user.userId;

    const {
        username,
        bio,
        avatarUrl
    } = req.body;

    userClient.updateProfile(
        {
            userId,
            username,
            bio,
            avatarUrl
        },
        (error, response) => {
            if (error) {
                console.error("UpdateProfile gRPC error:", error.message);

                if (error.code === grpc.status.INVALID_ARGUMENT) {
                    return res.status(400).json({
                        message: error.details
                    });
                }

                if (error.code === grpc.status.NOT_FOUND) {
                    return res.status(404).json({
                        message: error.details
                    });
                }

                if (error.code === grpc.status.UNAVAILABLE) {
                    return res.status(503).json({
                        message: "User service unavailable"
                    });
                }

                return res.status(500).json({
                    message: "Internal server error"
                });
            }

            res.json(response);
        }
    );
});
module.exports= router;