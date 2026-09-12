const express = require("express");
const authClient = require("../grpc/auth.client");

const router = express.Router();

router.post("/register", (req, res) => {
    const { username, email, password } = req.body;

    authClient.register(
        {
            username,
            email,
            password
        },
        (error, response) => {
            if (error) {
                console.error("Register gRPC error:", error);

                return res.status(500).json({
                    message: "Auth service unavailable"
                });
            }

            res.json(response);
        }
    );
});

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    authClient.login(
        {
            email,
            password
        },
        (error, response) => {
            if (error) {
                console.error("Login gRPC error:", error);

                return res.status(500).json({
                    message: "Auth service unavailable"
                });
            }

            res.json(response);
        }
    );
});

module.exports = router;