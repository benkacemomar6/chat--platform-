require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./gonfig/db");
const socketAuthMiddleware = require("./soket/auth.middleware");
const registerConversationHandlers = require("./soket/conversation.handler");
const registerMessageHandlers = require("./soket/message.handler");
const startGrpcServer=require('../grpc/chat.server')

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 4000;

io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
    console.log(
        "Authenticated user connected:",
        socket.user.userId
    );

    registerConversationHandlers(io, socket);
    registerMessageHandlers(io, socket);

    socket.on("disconnect", () => {
        console.log(
            "User disconnected:",
            socket.user.userId
        );
    });
});

async function startServer() {
    await connectDB();
    startGrpcServer();

    server.listen(PORT, () => {
        console.log(
            `Chat Service running on port ${PORT}`
        );
    });
}

startServer();