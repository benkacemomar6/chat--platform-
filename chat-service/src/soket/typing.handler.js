function registerTypingHandlers(io, socket) {
    socket.on("typing_start", ({ conversationId }) => {
        socket.to(conversationId).emit("user_typing", {
            userId: socket.user.userId,
            conversationId
        });
    });

    socket.on("typing_stop", ({ conversationId }) => {
        socket.to(conversationId).emit(
            "user_stopped_typing",
            {
                userId: socket.user.userId,
                conversationId
            }
        );
    });
}

module.exports = registerTypingHandlers;