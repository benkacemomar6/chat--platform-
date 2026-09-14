const express =
    require("express");

const grpc =
    require("@grpc/grpc-js");

const authMiddleware =
    require(
        "../middleware/auth.middleware"
    );

const notificationClient =
    require(
        "../grpc/notification.client"
    );

const router =
    express.Router();

router.get(
    "/",
    authMiddleware,
    (req, res) => {
        const userId =
            req.user.userId;

        notificationClient
            .getNotifications(
                {
                    userId
                },
                (
                    error,
                    response
                ) => {
                    if (error) {
                        return res
                            .status(500)
                            .json({
                                message:
                                    "Failed to get notifications"
                            });
                    }

                    res.json(
                        response
                    );
                }
            );
    }
);

router.patch(
    "/:notificationId/read",
    authMiddleware,
    (req, res) => {
        const userId =
            req.user.userId;

        const notificationId =
            req.params
                .notificationId;

        notificationClient
            .markAsRead(
                {
                    userId,
                    notificationId
                },
                (
                    error,
                    response
                ) => {
                    if (error) {
                        if (
                            error.code ===
                            grpc.status
                                .NOT_FOUND
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
                            grpc.status
                                .PERMISSION_DENIED
                        ) {
                            return res
                                .status(403)
                                .json({
                                    message:
                                        error.details
                                });
                        }

                        if (
                            error.code ===
                            grpc.status
                                .INVALID_ARGUMENT
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
                                    "Failed to update notification"
                            });
                    }

                    res.json(
                        response
                    );
                }
            );
    }
);

module.exports =
    router;