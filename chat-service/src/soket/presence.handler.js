const {
    redisClient
} = require("../gonfig/redis");

function registerPresenceHandlers(io, socket) {
    const userId = socket.user.userId;

    const key = `presence:${userId}`;

    async function markOnline() {
        try {
            const wasOnline =
                await redisClient.sCard(key);

            await redisClient.sAdd(
                key,
                socket.id
            );

            console.log(
                `${userId} connected with socket ${socket.id}`
            );

            // User was completely offline before this socket
            if (wasOnline === 0) {
                io.emit("user_online", {
                    userId
                });
            }
        } catch (error) {
            console.error(
                "Presence online error:",
                error
            );
        }
    }

    markOnline();

    socket.on("disconnect", async () => {
        try {
            await redisClient.sRem(
                key,
                socket.id
            );

            const remainingSockets =
                await redisClient.sCard(key);

            console.log(
                `${userId} disconnected socket ${socket.id}`
            );

            if (remainingSockets === 0) {
                await redisClient.del(key);

                io.emit("user_offline", {
                    userId
                });

                console.log(
                    `${userId} is offline`
                );
            }
        } catch (error) {
            console.error(
                "Presence offline error:",
                error
            );
        }
    });
}

module.exports = {
    registerPresenceHandlers
};