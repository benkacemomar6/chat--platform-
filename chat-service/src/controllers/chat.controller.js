const grpc = require("@grpc/grpc-js");
const Conversation = require("../models/conversation");
const Message = require("../models/message");

async function createConversation(call, callback) {
    try {
        const { userId, participantId } = call.request;

        if (!userId || !participantId) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "userId and participantId are required"
            });
        }

        if (userId === participantId) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "You cannot create a conversation with yourself"
            });
        }

        let conversation = await Conversation.findOne({
            participants: {
                $all: [userId, participantId],
                $size: 2
            }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [userId, participantId]
            });
        }

        callback(null, {
            success: true,
            message: "Conversation ready",
            conversation: {
                id: conversation._id.toString(),
                participants: conversation.participants,
                createdAt: conversation.createdAt.toISOString(),
                updatedAt: conversation.updatedAt.toISOString()
            }
        });

    } catch (error) {
        console.error("Create conversation error:", error);

        callback({
            code: grpc.status.INTERNAL,
            message: "Failed to create conversation"
        });
    }
}

async function getConversations(call, callback) {
    try {
        const { userId } = call.request;

        const conversations = await Conversation.find({
            participants: userId
        }).sort({ updatedAt: -1 });

        callback(null, {
            conversations: conversations.map((conversation) => ({
                id: conversation._id.toString(),
                participants: conversation.participants,
                createdAt: conversation.createdAt.toISOString(),
                updatedAt: conversation.updatedAt.toISOString()
            }))
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: "Failed to get conversations"
        });
    }
}

async function getMessages(call, callback) {
    try {
        const { userId, conversationId } = call.request;

        const conversation =
            await Conversation.findById(conversationId);

        if (!conversation) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Conversation not found"
            });
        }

        if (!conversation.participants.includes(userId)) {
            return callback({
                code: grpc.status.PERMISSION_DENIED,
                message: "Not authorized"
            });
        }

        const messages = await Message.find({
            conversationId
        }).sort({ createdAt: 1 });

        callback(null, {
            messages: messages.map((message) => ({
                id: message._id.toString(),
                conversationId:
                    message.conversationId.toString(),
                senderId: message.senderId,
                content: message.content,
                createdAt:
                    message.createdAt.toISOString()
            }))
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: "Failed to get messages"
        });
    }
}

module.exports = {
    createConversation,
    getConversations,
    getMessages
};