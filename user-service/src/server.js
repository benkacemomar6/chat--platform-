require("dotenv").config();

const connectDB = require("./config/db");
const startGrpcServer = require("./grpc/user.server");
const {
    connectRabbitMQ
} = require("./messaging/rabittmq");

const startUserRegisteredConsumer =
    require("./consumers/userRegistered.consumer");

async function start() {
    await connectDB();

    await connectRabbitMQ();

    await startUserRegisteredConsumer();

    startGrpcServer();
}

start();