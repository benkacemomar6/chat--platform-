const UserProfile = require("../models/UserProfile");
const { getChannel } = require("../messaging/rabittmq");

async function startUserRegisteredConsumer() {
    const channel = getChannel();

    const queue = "user_registered";

    await channel.assertQueue(queue, {
        durable: true
    });

    console.log("Waiting for UserRegistered events...");

    channel.consume(
        queue,
        async (message) => {
            if (!message) return;

            const retryCount =
                message.properties.headers?.retryCount || 0;

            console.log("Retry count:", retryCount);

            try {
                const event = JSON.parse(
                    message.content.toString()
                );

                console.log("Received UserRegistered:", event);

                const existingProfile =
                    await UserProfile.findOne({
                        userId: event.userId
                    });

                if (!existingProfile) {
                    await UserProfile.create({
                        userId: event.userId,
                        username: event.username,
                        bio: "",
                        avatarUrl: ""
                    });

                    console.log("User profile created");
                }

                channel.ack(message);

            } catch (error) {
                console.error(
                    "Failed to process UserRegistered:",
                    error
                );

                if (retryCount < 2) {
                    channel.publish(
                        "user_registered_retry_exchange",
                        "user.registered.retry",
                        message.content,
                        {
                            persistent: true,
                            headers: {
                                ...message.properties.headers,
                                retryCount: retryCount + 1
                            }
                        }
                    );

                    console.log(
                        "Message sent to retry queue"
                    );

                    channel.ack(message);

                } else {
                    channel.publish(
                        "user_registered_dead_exchange",
                        "user.registered.dead",
                        message.content,
                        {
                            persistent: true,
                            headers: {
                                ...message.properties.headers,
                                retryCount
                            }
                        }
                    );

                    console.log(
                        "Message sent to DLQ"
                    );

                    channel.ack(message);
                }
            }
        },
        {
            noAck: false
        }
    );
}

module.exports = startUserRegisteredConsumer;