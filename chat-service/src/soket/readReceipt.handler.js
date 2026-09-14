const Message = require("../models/message");
const Conversation = require("../models/conversation");

function registerReadReceiptHandlers(io, socket) {

    socket.on(
        "message_read",
        async ({ messageId }, callback) => {
            try {
                const message =
                    await Message.findById(messageId);

                if (!message) {
                    return callback({
                        success: false,
                        message: "Message not found"
                    });
                }

                const conversation =
                    await Conversation.findById(
                        message.conversationId
                    );

                const userId =
                    socket.user.userId;

                const isParticipant =
                    conversation.participants.includes(
                        userId
                    );

                if (!isParticipant) {
                    return callback({
                        success: false,
                        message: "Not authorized"
                    });
                }

                if (!message.readBy.includes(userId)) {
                    message.readBy.push(userId);

                    await message.save();
                }

                io.to(
                    message.conversationId.toString()
                ).emit(
                    "message_read",
                    {
                        messageId:
                            message._id.toString(),
                        userId
                    }
                );

                callback({
                    success: true
                });

            } catch (error) {
                console.error(
                    "Read receipt error:",
                    error
                );

                callback({
                    success: false,
                    message:
                        "Failed to mark message as read"
                });
            }
        }
    );
}

module.exports =
    registerReadReceiptHandlers;