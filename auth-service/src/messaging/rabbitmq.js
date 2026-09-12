const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
    const connection = await amqp.connect(
        process.env.RABBITMQ_URL
    );

    channel = await connection.createChannel();

    console.log("Auth Service connected to RabbitMQ");
}

function getChannel() {
    if (!channel) {
        throw new Error("RabbitMQ channel not initialized");
    }

    return channel;
}

module.exports = {
    connectRabbitMQ,
    getChannel
};