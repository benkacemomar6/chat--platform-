require("dotenv").config();

const connectDB =
    require("./config/db");

const {
    connectRabbitMQ
} =
    require("./messaging/rabbitmq");

const startMessageSentConsumer =
    require(
        "./consumers/messageSent.consumer"
    );

const startGrpcServer =
    require(
        "./grpc/notification.server"
    );

async function startServer() {
    await connectDB();

    await connectRabbitMQ();

    await startMessageSentConsumer();

    startGrpcServer();

    console.log(
        "Notification Service started"
    );
}

startServer();