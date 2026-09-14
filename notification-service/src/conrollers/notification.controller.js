const grpc =
    require("@grpc/grpc-js");

const mongoose =
    require("mongoose");

const Notification =
    require("../models/Notification");

async function getNotifications(
    call,
    callback
) {
    try {
        const { userId } =
            call.request;

        const notifications =
            await Notification.find({
                userId
            }).sort({
                createdAt: -1
            });

        callback(null, {
            notifications:
                notifications.map(
                    (notification) => ({
                        id:
                            notification._id.toString(),

                        userId:
                            notification.userId,

                        type:
                            notification.type,

                        message:
                            notification.message,

                        relatedId:
                            notification.relatedId || "",

                        read:
                            notification.read,

                        createdAt:
                            notification.createdAt.toISOString()
                    })
                )
        });

    } catch (error) {
        console.error(
            "Get notifications error:",
            error
        );

        callback({
            code: grpc.status.INTERNAL,
            message:
                "Failed to get notifications"
        });
    }
}

async function markAsRead(
    call,
    callback
) {
    try {
        const {
            userId,
            notificationId
        } = call.request;

        if (
            !mongoose.Types.ObjectId.isValid(
                notificationId
            )
        ) {
            return callback({
                code:
                    grpc.status.INVALID_ARGUMENT,
                message:
                    "Invalid notification ID"
            });
        }

        const notification =
            await Notification.findById(
                notificationId
            );

        if (!notification) {
            return callback({
                code:
                    grpc.status.NOT_FOUND,
                message:
                    "Notification not found"
            });
        }

        if (
            notification.userId !==
            userId
        ) {
            return callback({
                code:
                    grpc.status.PERMISSION_DENIED,
                message:
                    "Not authorized"
            });
        }

        notification.read = true;

        await notification.save();

        callback(null, {
            success: true,
            message:
                "Notification marked as read"
        });

    } catch (error) {
        console.error(
            "Mark notification error:",
            error
        );

        callback({
            code:
                grpc.status.INTERNAL,
            message:
                "Failed to update notification"
        });
    }
}

module.exports = {
    getNotifications,
    markAsRead
};