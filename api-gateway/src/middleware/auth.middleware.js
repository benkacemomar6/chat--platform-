const authClient = require("../grpc/auth.client");

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Authorization header missing"
        });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            message: "Invalid authorization format"
        });
    }

    const token = parts[1];

    authClient.verifyToken(
        { token },
        (error, response) => {
            if (error) {
                console.error("VerifyToken gRPC error:", error);

                return res.status(500).json({
                    message: "Auth service unavailable"
                });
            }

            if (!response.valid) {
                return res.status(401).json({
                    message: response.message
                });
            }

            req.user = {
                userId: response.userId,
                email: response.email
            };

            next();
        }
    );
}

module.exports = authMiddleware;