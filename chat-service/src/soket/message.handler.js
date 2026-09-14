const mongoose = require("mongoose");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const publishMessageSent =
    require("../events/messageSent.publisher");
function registerMessageHandlers(io, socket) {
    socket.on(
        "send_message",
        async ({ conversationId, content }, callback) => {

            console.log("1 - send_message received");
            console.log("conversationId:", conversationId);
            console.log("content:", content);
            console.log("socket user:", socket.user);

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

                if (!content || !content.trim()) {
                    return callback({
                        success: false,
                        message: "Message cannot be empty"
                    });
                }

                const conversation =
                    await Conversation.findById(
                        conversationId
                    );

                console.log("2 - conversation found:", conversation);

                if (!conversation) {
                    return callback({
                        success: false,
                        message: "Conversation not found"
                    });
                }

                const senderId =
                    socket.user.userId;

                const isParticipant =
                    conversation.participants.includes(
                        senderId
                    );

                console.log("3 - isParticipant:", isParticipant);

                if (!isParticipant) {
                    return callback({
                        success: false,
                        message: "Not authorized"
                    });
                }

                console.log("4 - about to save message");

                const message =
                    await Message.create({
                        conversationId,
                        senderId,
                        content: content.trim()
                    });
                    await publishMessageSent(message);

                console.log("5 - message saved:", message);

                io.to(conversationId).emit(
                    "new_message",
                    {
                        id: message._id.toString(),
                        conversationId:
                            message.conversationId.toString(),
                        senderId: message.senderId,
                        content: message.content,
                        createdAt: message.createdAt
                    }
                );

                callback({
                    success: true,
                    messageId:
                        message._id.toString()
                });

            } catch (error) {
                console.error(
                    "Send message error:",
                    error
                );

                callback({
                    success: false,
                    message:
                        "Failed to send message"
                });
            }
        }
    );
}

module.exports = registerMessageHandlers;