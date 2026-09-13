const mongoose = require("mongoose");
const Conversation = require("../models/conversation");

function registerConversationHandlers(io, socket) {
    socket.on(
        "join_conversation",
        async ({ conversationId }, callback) => {
            try {
                if (
                    !mongoose.Types.ObjectId.isValid(
                        conversationId
                    )
                ) {
                    return callback({
                        success: false,
                        message: "Invalid conversation ID"
                    });
                }

                const conversation =
                    await Conversation.findById(
                        conversationId
                    );

                if (!conversation) {
                    return callback({
                        success: false,
                        message: "Conversation not found"
                    });
                }

                const userId = socket.user.userId;

                const isParticipant =
                    conversation.participants.includes(
                        userId
                    );

                if (!isParticipant) {
                    return callback({
                        success: false,
                        message:
                            "You are not allowed to join this conversation"
                    });
                }

                socket.join(conversationId);

                callback({
                    success: true,
                    message: "Joined conversation"
                });
            } catch (error) {
                console.error(
                    "Join conversation error:",
                    error
                );

                callback({
                    success: false,
                    message:
                        "Failed to join conversation"
                });
            }
        }
    );
}

module.exports = registerConversationHandlers;