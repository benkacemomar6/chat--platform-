require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const authClient = require("./grpc/auth.client");
const connectDB=require('./gonfig/db')

const app = express();

const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 4000;
io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(
            new Error("Authentication token missing")
        );
    }

    authClient.verifyToken(
        { token },
        (error, response) => {
            if (error) {
                return next(
                    new Error("Authentication failed")
                );
            }

            if (!response.valid) {
                return next(
                    new Error("Invalid token")
                );
            }

            socket.user = {
                userId: response.userId,
                email: response.email
            };

            next();
        }
    );
});

async function startServer() {
    await connectDB();

    server.listen(PORT, () => {
        console.log(
            `Chat Service running on port ${PORT}`
        );
    });
}

startServer();