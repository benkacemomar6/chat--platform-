const mongoose = require("mongoose");

const notificationSchema =
    new mongoose.Schema(
        {
            userId: {
                type: String,
                required: true,
                index: true
            },

            type: {
                type: String,
                required: true
            },

            message: {
                type: String,
                required: true
            },

            relatedId: {
                type: String
            },

            read: {
                type: Boolean,
                default: false
            }
        },
        {
            timestamps: true
        }
    );

module.exports =
    mongoose.model(
        "Notification",
        notificationSchema
    );