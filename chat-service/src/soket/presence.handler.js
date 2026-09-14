const onlineUsers = new Map();

function registerPresenceHandlers(io, socket) {
    const userId = socket.user.userId;

    onlineUsers.set(userId, socket.id);

    console.log(`${userId} is online`);

    io.emit("user_online", {
        userId
    });

    socket.on("disconnect", () => {
        onlineUsers.delete(userId);

        console.log(`${userId} is offline`);

        io.emit("user_offline", {
            userId
        });
    });
}

module.exports = {
    registerPresenceHandlers,
    onlineUsers
};