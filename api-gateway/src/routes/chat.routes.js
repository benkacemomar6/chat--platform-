const express = require("express");
const grpc = require("@grpc/grpc-js");

const authMiddleware =
    require("../middleware/auth.middleware");

const chatClient =
    require("../grpc/chat.client");

const router = express.Router();
router.post(
    "/conversations",
    authMiddleware,
    (req, res) => {
        const userId = req.user.userId;
        const { participantId } = req.body;

        chatClient.createConversation(
            {
                userId,
                participantId
            },
            (error, response) => {
                if (error) {
                    if (
                        error.code ===
                        grpc.status.INVALID_ARGUMENT
                    ) {
                        return res
                            .status(400)
                            .json({
                                message:
                                    error.details
                            });
                    }

                    return res
                        .status(500)
                        .json({
                            message:
                                "Failed to create conversation"
                        });
                }

                res.json(response);
            }
        );
    }
);
router.get(
    "/conversations",
    authMiddleware,
    (req, res) => {
        const userId = req.user.userId;

        chatClient.getConversations(
            { userId },
            (error, response) => {
                if (error) {
                    return res
                        .status(500)
                        .json({
                            message:
                                "Failed to get conversations"
                        });
                }

                res.json(response);
            }
        );
    }
);
router.get(
    "/conversations/:conversationId/messages",
    authMiddleware,
    (req, res) => {
        const limit =
    parseInt(req.query.limit) || 30;

const before =
    req.query.before || "";
        const userId = req.user.userId;

        const conversationId =
            req.params.conversationId;

        chatClient.getMessages(
            {
                userId,
                conversationId,
                limit,
                before
            },
            (error, response) => {
                if (error) {
                    if (
                        error.code ===
                        grpc.status.NOT_FOUND
                    ) {
                        return res
                            .status(404)
                            .json({
                                message:
                                    error.details
                            });
                    }

                    if (
                        error.code ===
                        grpc.status.PERMISSION_DENIED
                    ) {
                        return res
                            .status(403)
                            .json({
                                message:
                                    error.details
                            });
                    }

                    return res
                        .status(500)
                        .json({
                            message:
                                "Failed to get messages"
                        });
                }

                res.json(response);
            }
        );
    }
);
module.exports = router;