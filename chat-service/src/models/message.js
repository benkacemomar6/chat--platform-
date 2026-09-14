const messageSchema = new mongoose.Schema(
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
        },

        readBy: {
            type: [String],
            default: []
        }
    },
    {
        timestamps: true
    }
);