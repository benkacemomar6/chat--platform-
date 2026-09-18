const { createClient } = require("redis");

const redisClient = createClient({
    url: process.env.REDIS_URL
});

const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

redisClient.on("error", (error) => {
    console.error("Redis error:", error);
});

pubClient.on("error", (error) => {
    console.error("Redis pub error:", error);
});

subClient.on("error", (error) => {
    console.error("Redis sub error:", error);
});

async function connectRedis() {
    await redisClient.connect();
    await pubClient.connect();
    await subClient.connect();

    console.log("Chat Service connected to Redis");
}

module.exports = {
    connectRedis,
    redisClient,
    pubClient,
    subClient
};