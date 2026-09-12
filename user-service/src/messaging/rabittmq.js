const amqp = require("amqplib");
const setup=require("./setupRabbitiMQ")

let channel;

async function connectRabbitMQ() {
    const connection = await amqp.connect(
        process.env.RABBITMQ_URL
    );

    channel = await connection.createChannel();
    await setup(channel);

    console.log("User Service connected to RabbitMQ");
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