const {
    getChannel
} = require("../messaging/rabbitmq");

async function publishMessageSent(
    message,
    recipientId
) {
    const channel = getChannel();

    const exchange =
        "message_sent_exchange";

    const routingKey =
        "message.sent";

    await channel.assertExchange(
        exchange,
        "direct",
        {
            durable: true
        }
    );

    const event = {
        messageId:
            message._id.toString(),

        conversationId:
            message.conversationId.toString(),

        senderId:
            message.senderId,

        recipientId,

        content:
            message.content,

        createdAt:
            message.createdAt
    };

    channel.publish(
        exchange,
        routingKey,
        Buffer.from(
            JSON.stringify(event)
        ),
        {
            persistent: true
        }
    );

    console.log(
        "MessageSent event published:",
        event
    );
}

module.exports =
    publishMessageSent;