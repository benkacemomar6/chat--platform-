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
        const {
    userId,
    conversationId,
    limit = 30,
    before
} = call.request;

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

const query = {
    conversationId
};

if (before) {
    query.createdAt = {
        $lt: new Date(before)
    };
}

const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);

const orderedMessages = messages.reverse();

const nextCursor =
    orderedMessages.length > 0
        ? orderedMessages[0].createdAt.toISOString()
        : "";

      callback(null, {
    messages: orderedMessages.map((message) => ({
        id: message._id.toString(),
        conversationId:
            message.conversationId.toString(),
        senderId: message.senderId,
        content: message.content,
        createdAt:
            message.createdAt.toISOString()
    })),
    nextCursor
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