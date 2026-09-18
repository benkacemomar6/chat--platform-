const express = require("express");
const authClient = require("../grpc/auth.client");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

function serviceError(res, operation, error) {
    console.error(`${operation} gRPC error:`, error.message);
    return res.status(503).json({
        success: false,
        message: "Auth service unavailable"
    });
}

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
                return serviceError(res, "Register", error);
            }

            res.status(response.success ? 200 : 400).json(response);
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
                return serviceError(res, "Login", error);
            }

            res.status(response.success ? 200 : 401).json(response);
        }
    );
});

router.post("/refresh", (req, res) => {
    authClient.refreshToken(
        { refreshToken: req.body.refreshToken },
        (error, response) => {
            if (error) {
                return serviceError(res, "RefreshToken", error);
            }

            res.status(response.success ? 200 : 401).json(response);
        }
    );
});

router.post("/logout", (req, res) => {
    authClient.logout(
        { refreshToken: req.body.refreshToken },
        (error, response) => {
            if (error) {
                return serviceError(res, "Logout", error);
            }

            res.status(response.success ? 200 : 400).json(response);
        }
    );
});

router.post("/logout-all", authMiddleware, (req, res) => {
    authClient.logoutAll(
        { userId: req.user.userId },
        (error, response) => {
            if (error) {
                return serviceError(res, "LogoutAll", error);
            }

            res.status(response.success ? 200 : 401).json(response);
        }
    );
});

module.exports = router;
