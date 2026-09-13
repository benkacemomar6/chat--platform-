const authClient = require("../../grpc/auth.client");

function socketAuthMiddleware(socket, next) {
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
}

module.exports = socketAuthMiddleware;