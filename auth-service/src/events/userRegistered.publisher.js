const { getChannel } = require("../messaging/rabbitmq");

async function publishUserRegistered(user) {
    const channel = getChannel();

    const queue = "user_registered";

    await channel.assertQueue(queue, {
        durable: true
    });

    const event = {
        userId: user._id.toString(),
        username: user.username,
        email: user.email
    };

    channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(event)),
        {
            persistent: true
        }
    );

    console.log("UserRegistered event published:", event);
}

module.exports = publishUserRegistered;