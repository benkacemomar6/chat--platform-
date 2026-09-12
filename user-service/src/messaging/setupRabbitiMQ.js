async function setup(channel) {
    const mainExchange = "user_registered_exchange";
    const retryExchange = "user_registered_retry_exchange";
    const deadExchange = "user_registered_dead_exchange";

    const mainQueue = "user_registered";
    const retryQueue = "user_registered_retry";
    const dlq = "user_registered_dlq";

    await channel.assertExchange(mainExchange, "direct", {
        durable: true
    });

    await channel.assertExchange(retryExchange, "direct", {
        durable: true
    });

    await channel.assertExchange(deadExchange, "direct", {
        durable: true
    });

    await channel.assertQueue(mainQueue, {
        durable: true
    });

    await channel.bindQueue(
        mainQueue,
        mainExchange,
        "user.registered"
    );

    await channel.assertQueue(retryQueue, {
        durable: true,
        arguments: {
            "x-message-ttl": 5000,
            "x-dead-letter-exchange": mainExchange,
            "x-dead-letter-routing-key": "user.registered"
        }
    });

    await channel.bindQueue(
        retryQueue,
        retryExchange,
        "user.registered.retry"
    );

    await channel.assertQueue(dlq, {
        durable: true
    });

    await channel.bindQueue(
        dlq,
        deadExchange,
        "user.registered.dead"
    );

    console.log("RabbitMQ topology ready");
}

module.exports = setup;