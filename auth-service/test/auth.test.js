const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

process.env.JWT_SECRET = "unit-test-access-secret-that-is-long-and-distinct";
process.env.JWT_REFRESH_SECRET = "unit-test-refresh-secret-that-is-long-and-distinct";

const publisherPath = require.resolve("../src/events/userRegistered.publisher");
require.cache[publisherPath] = {
    id: publisherPath,
    filename: publisherPath,
    loaded: true,
    exports: async () => {}
};

const User = require("../src/models/User");
const RefreshSession = require("../src/models/refreshSession");
const token = require("../src/utils/token");

let users;
let sessions;
let sequence;

function sameId(left, right) {
    return String(left) === String(right);
}

function applySet(document, update) {
    Object.assign(document, update.$set || {});
}

User.findOne = async ({ email }) => users.find((user) => user.email === email) || null;
User.findById = async (id) => users.find((user) => sameId(user._id, id)) || null;
User.create = async (data) => {
    const user = { ...data, _id: new mongoose.Types.ObjectId() };
    users.push(user);
    return user;
};

RefreshSession.create = async (data) => {
    const session = {
        ...data,
        _id: `session-${sequence++}`,
        revokedAt: data.revokedAt || null,
        replacedByTokenHash: data.replacedByTokenHash || null,
        reuseDetectedAt: data.reuseDetectedAt || null
    };
    sessions.push(session);
    return session;
};
RefreshSession.findOneAndUpdate = async (filter, update) => {
    const session = sessions.find((candidate) =>
        candidate.tokenHash === filter.tokenHash &&
        sameId(candidate.userId, filter.userId) &&
        candidate.revokedAt === null &&
        candidate.expiresAt > filter.expiresAt.$gt
    );
    if (!session) return null;
    applySet(session, update);
    return session;
};
RefreshSession.findOne = async ({ tokenHash }) =>
    sessions.find((session) => session.tokenHash === tokenHash) || null;
RefreshSession.findById = async (id) =>
    sessions.find((session) => session._id === id) || null;
RefreshSession.updateOne = async (filter, update) => {
    const session = sessions.find((candidate) => {
        if (filter._id && candidate._id !== filter._id) return false;
        if (filter.tokenHash && candidate.tokenHash !== filter.tokenHash) return false;
        if (Object.hasOwn(filter, "revokedAt") && candidate.revokedAt !== filter.revokedAt) return false;
        if (Object.hasOwn(filter, "reuseDetectedAt") && candidate.reuseDetectedAt !== filter.reuseDetectedAt) return false;
        return true;
    });
    if (session) applySet(session, update);
    return { matchedCount: session ? 1 : 0 };
};
RefreshSession.updateMany = async (filter, update) => {
    const matches = sessions.filter((candidate) =>
        sameId(candidate.userId, filter.userId) &&
        (!Object.hasOwn(filter, "revokedAt") || candidate.revokedAt === filter.revokedAt)
    );
    matches.forEach((session) => applySet(session, update));
    return { modifiedCount: matches.length };
};

const controller = require("../src/controllers/auth.controller");

function invoke(handler, request) {
    return new Promise((resolve, reject) => {
        handler({ request }, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
}

async function addUser(email = "user@example.com", password = "password123") {
    const user = {
        _id: new mongoose.Types.ObjectId(),
        username: "test-user",
        email,
        password: await bcrypt.hash(password, 4)
    };
    users.push(user);
    return user;
}

test.beforeEach(() => {
    users = [];
    sessions = [];
    sequence = 1;
});

test("token utilities separate access and refresh credentials", async () => {
    const user = await addUser();
    const accessToken = token.createAccessToken(user);
    const refreshToken = token.createRefreshToken(user);

    assert.equal(token.verifyAccessToken(accessToken).type, "access");
    assert.equal(token.verifyRefreshToken(refreshToken).type, "refresh");
    assert.throws(() => token.verifyAccessToken(refreshToken));
    assert.notEqual(token.hashToken(refreshToken), refreshToken);
    assert.equal(token.hashToken(refreshToken).length, 64);
    assert.notEqual(token.createRefreshToken(user), refreshToken);

    const accessPayload = token.verifyAccessToken(accessToken);
    const refreshPayload = token.verifyRefreshToken(refreshToken);
    assert.equal(accessPayload.exp - accessPayload.iat, 15 * 60);
    assert.equal(refreshPayload.exp - refreshPayload.iat, 7 * 24 * 60 * 60);
});

test("register and login return token pairs while bad credentials stay generic", async () => {
    const registered = await invoke(controller.register, {
        username: "new-user",
        email: "new@example.com",
        password: "password123"
    });
    assert.equal(registered.success, true);
    assert.ok(registered.accessToken);
    assert.ok(registered.refreshToken);
    assert.equal(registered.token, registered.accessToken);
    assert.equal(sessions[0].tokenHash, token.hashToken(registered.refreshToken));
    assert.notEqual(sessions[0].tokenHash, registered.refreshToken);

    const loggedIn = await invoke(controller.login, {
        email: "new@example.com",
        password: "password123"
    });
    assert.equal(loggedIn.success, true);
    assert.ok(loggedIn.accessToken);
    assert.ok(loggedIn.refreshToken);

    const rejected = await invoke(controller.login, {
        email: "new@example.com",
        password: "wrong-password"
    });
    assert.equal(rejected.success, false);
    assert.equal(rejected.message, "Invalid email or password");
});

test("VerifyToken accepts only access tokens", async () => {
    const user = await addUser();
    const accessToken = token.createAccessToken(user);
    const refreshToken = token.createRefreshToken(user);
    const expiredAccessToken = jwt.sign(
        { userId: user._id.toString(), email: user.email, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: -1, algorithm: "HS256" }
    );

    assert.equal((await invoke(controller.verifyToken, { token: accessToken })).valid, true);
    assert.equal((await invoke(controller.verifyToken, { token: refreshToken })).valid, false);
    assert.equal((await invoke(controller.verifyToken, { token: expiredAccessToken })).valid, false);
    assert.equal((await invoke(controller.verifyToken, { token: "invalid" })).valid, false);
});

test("rotation invalidates the old token and reuse revokes its replacement", async () => {
    await addUser();
    const login = await invoke(controller.login, {
        email: "user@example.com",
        password: "password123"
    });
    const rotated = await invoke(controller.refreshToken, { refreshToken: login.refreshToken });

    assert.equal(rotated.success, true);
    assert.notEqual(rotated.refreshToken, login.refreshToken);
    assert.equal(sessions[0].revokedAt instanceof Date, true);

    const reused = await invoke(controller.refreshToken, { refreshToken: login.refreshToken });
    assert.equal(reused.success, false);
    assert.equal(sessions[0].reuseDetectedAt instanceof Date, true);

    const replacement = await invoke(controller.refreshToken, { refreshToken: rotated.refreshToken });
    assert.equal(replacement.success, false);
});

test("logout is idempotent and its refresh token stays revoked", async () => {
    await addUser();
    const first = await invoke(controller.login, {
        email: "user@example.com",
        password: "password123"
    });

    assert.equal((await invoke(controller.logout, { refreshToken: first.refreshToken })).success, true);
    assert.equal((await invoke(controller.logout, { refreshToken: first.refreshToken })).success, true);
    assert.equal((await invoke(controller.refreshToken, { refreshToken: first.refreshToken })).success, false);
});

test("logout-all revokes every active session for the access-token user", async () => {
    const user = await addUser();
    const first = await invoke(controller.login, {
        email: "user@example.com",
        password: "password123"
    });
    const second = await invoke(controller.login, {
        email: "user@example.com",
        password: "password123"
    });

    await invoke(controller.logoutAll, { userId: user._id.toString() });
    assert.equal((await invoke(controller.refreshToken, { refreshToken: first.refreshToken })).success, false);
    assert.equal((await invoke(controller.refreshToken, { refreshToken: second.refreshToken })).success, false);
    assert.equal(sessions.every((session) => session.revokedAt instanceof Date), true);
});

test("an expired database session is rejected before TTL cleanup", async () => {
    await addUser();
    const login = await invoke(controller.login, {
        email: "user@example.com",
        password: "password123"
    });
    sessions[0].expiresAt = new Date(Date.now() - 1000);

    const response = await invoke(controller.refreshToken, { refreshToken: login.refreshToken });
    assert.equal(response.success, false);
});

test("two concurrent refresh requests cannot both succeed", async () => {
    await addUser();
    const login = await invoke(controller.login, {
        email: "user@example.com",
        password: "password123"
    });

    const responses = await Promise.all([
        invoke(controller.refreshToken, { refreshToken: login.refreshToken }),
        invoke(controller.refreshToken, { refreshToken: login.refreshToken })
    ]);

    assert.ok(responses.filter((response) => response.success).length <= 1);
    assert.equal(sessions[0].reuseDetectedAt instanceof Date, true);
});
