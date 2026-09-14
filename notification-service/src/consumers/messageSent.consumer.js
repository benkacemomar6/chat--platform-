const Notification =
    require("../models/Notification");

const {
    getChannel
} = require("../messaging/rabbitmq");

async function startMessageSentConsumer() {
    const channel = getChannel();

    const exchange =
        "message_sent_exchange";

    const queue =
        "notification_message_sent";

    const routingKey =
        "message.sent";

    await channel.assertExchange(
        exchange,
        "direct",
        {
            durable: true
        }
    );

    await channel.assertQueue(
        queue,
        {
            durable: true
        }
    );

    await channel.bindQueue(
        queue,
        exchange,
        routingKey
    );

    console.log(
        "Waiting for MessageSent events..."
    );

    channel.consume(
        queue,
        async (message) => {
            if (!message) return;

            try {
                const event =
                    JSON.parse(
                        message.content.toString()
                    );

                console.log(
                    "MessageSent received:",
                    event
                );

                /*
                  For now recipientId must exist
                  in the MessageSent event.
                */

                if (!event.recipientId) {
                    throw new Error(
                        "recipientId missing from MessageSent event"
                    );
                }

                await Notification.create({
                    userId: event.recipientId,
                    type: "NEW_MESSAGE",
                    message:
                        "You received a new message",
                    relatedId:
                        event.messageId,
                    read: false
                });

                console.log(
                    "Notification created"
                );

                channel.ack(message);

            } catch (error) {
                console.error(
                    "Failed to process MessageSent:",
                    error
                );

                channel.nack(
                    message,
                    false,
                    true
                );
            }
        },
        {
            noAck: false
        }
    );
}

module.exports =
    startMessageSentConsumer;