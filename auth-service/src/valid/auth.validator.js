const { z } = require("zod");

const registerSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username is too long"),

    email: z
        .string()
        .email("Invalid email"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
});

const loginSchema = z.object({
    email: z.string().email("Invalid email"),

    password: z.string().min(1, "Password is required")
});

module.exports = {
    registerSchema,
    loginSchema
}; 