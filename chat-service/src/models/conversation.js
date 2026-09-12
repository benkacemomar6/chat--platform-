const mongoose = require("mongoose");

const conversationSchema =
    new mongoose.Schema(
        {
            participants: [
                {
                    type: String,
                    required: true
                }
            ]
        },
        {
            timestamps: true
        }
    );

module.exports = mongoose.model(
    "Conversation",
    conversationSchema
);