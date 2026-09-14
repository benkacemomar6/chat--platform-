const { io } = require("socket.io-client");

const socket = io("http://localhost:4000", {
    auth: {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWE1NjI1NmFjZWEwMmVmZTM1OGUzY2YiLCJlbWFpbCI6Im9tYXIydGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc4OTI5MDAzMiwiZXhwIjoxNzg5MjkzNjMyfQ.khR3n6fdII8uP0DapHFrAaf4RQZCzDb3Tqf1BWcPXes"
    }
});

const conversationId = "6aa6683d0b09fdc0707d1dbe";

socket.on("connect", () => {
    console.log("B connected:", socket.id);

    socket.emit(
        "join_conversation",
        { conversationId },
        (response) => {
            console.log("B join:", response);
        }
    );
});

socket.on("new_message", (message) => {
    console.log("B received:", message);
});
socket.on("user_typing", (data) => {
    console.log(
        `${data.userId} is typing...`
    );
});

socket.on("user_stopped_typing", (data) => {
    console.log(
        `${data.userId} stopped typing`
    );
});

socket.on("connect_error", (err) => {
    console.log("B connection error:", err.message);
});