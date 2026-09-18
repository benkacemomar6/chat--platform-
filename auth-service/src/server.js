require("dotenv").config();

const connectDB = require("./config/db");
const startGrpcServer = require("./grpc/auth.server");
const {
    connectRabbitMQ
} = require("./messaging/rabbitmq");

function validateEnvironment() {
    const required = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
    const missing = required.filter((name) => !process.env[name]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
        throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different");
    }
}

async function start() {
    validateEnvironment();
    await connectDB();
    await connectRabbitMQ();
    startGrpcServer();
}

start().catch((error) => {
    console.error("Auth Service startup failed:", error.message);
    process.exit(1);
});

module.exports = { validateEnvironment };
