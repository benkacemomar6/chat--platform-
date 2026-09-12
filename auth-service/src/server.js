require("dotenv").config();

const connectDB = require("./config/db");
const startGrpcServer = require("./grpc/auth.server");
const {
    connectRabbitMQ
}= require("./messaging/rabbitmq")

async function start() {
    await connectDB();
    await connectRabbitMQ();
    startGrpcServer();
}

start();