require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { createAdapter } =
    require("@socket.io/redis-adapter");
const {
    connectRedis,
    pubClient,
    subClient
} = require("./gonfig/redis");


const connectDB = require("./gonfig/db");
const socketAuthMiddleware = require("./soket/auth.middleware");
const registerConversationHandlers = require("./soket/conversation.handler");
const registerMessageHandlers = require("./soket/message.handler");
const startGrpcServer=require('../grpc/chat.server')
const registerTypingHandlers =
    require("./soket/typing.handler");
const registerReadReceiptHandlers =
    require("./soket/readReceipt.handler");
const {
    registerPresenceHandlers
} = require("./soket/presence.handler");
const {
    connectRabbitMQ
} = require("./messaging/rabbitmq");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3001"
    }
});

const PORT = process.env.PORT || 4000;

io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
    console.log(
        "Authenticated user connected:",
        socket.user.userId
    );

    registerConversationHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerReadReceiptHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on("disconnect", () => {
        console.log(
            "User disconnected:",
            socket.user.userId
        );
    });
});

async function startServer() {
    await connectDB();
    await connectRedis();
    await connectRabbitMQ();
    io.adapter(
    createAdapter(
        pubClient,
        subClient
    )
);
   
    startGrpcServer();

    server.listen(PORT, () => {
        console.log(
            `Chat Service running on port ${PORT}`
        );
    });
}

startServer();