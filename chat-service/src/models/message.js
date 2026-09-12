const mongoose = require("mongoose");

const messageSchema =
    new mongoose.Schema(
        {
            conversationId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Conversation",
                required: true,
                index: true
            },

            senderId: {
                type: String,
                required: true
            },

            content: {
                type: String,
                required: true,
                trim: true,
                maxlength: 2000
            }
        },
        {
            timestamps: true
        }
    );

module.exports = mongoose.model(
    "Message",
    messageSchema
);