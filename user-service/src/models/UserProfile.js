const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            unique: true
        },

        username: {
            type: String,
            required: true,
            trim: true
        },

        bio: {
            type: String,
            default: "",
            maxlength: 300
        },

        avatarUrl: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "UserProfile",
    userProfileSchema
);