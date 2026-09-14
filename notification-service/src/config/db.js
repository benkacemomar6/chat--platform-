const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Notification Service connected to MongoDB");
    } catch (error) {
        console.error(
            "Notification MongoDB connection failed:",
            error
        );

        process.exit(1);
    }
}

module.exports = connectDB;