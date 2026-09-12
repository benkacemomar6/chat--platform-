const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Chat Service connected to MongoDB");
    } catch (error) {
        console.error(
            "Chat Service MongoDB connection failed:",
            error
        );

        process.exit(1);
    }
}

module.exports = connectDB;