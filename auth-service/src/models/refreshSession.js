const mongoose = require("mongoose");

const refreshSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        revokedAt: {
            type: Date,
            default: null
        },

        replacedByTokenHash: {
            type: String,
            default: null
        },

        reuseDetectedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "RefreshSession",
    refreshSessionSchema
);

// TTL cleanup is asynchronous; controllers still enforce expiresAt on every use.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
