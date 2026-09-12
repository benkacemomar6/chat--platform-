const { io } = require("socket.io-client");

const socket = io("http://localhost:4000");

socket.on("connect", () => {
    console.log("Connected to server");
    console.log("connect a:", socket.id);

    socket.emit("join_room", {
        roomId: "room-1"
    });

    setTimeout(() => {
        socket.emit("send_room_message", {
            roomId: "room-1",
            message: "Hello from A"
        });
    }, 1000);
});

socket.on("room_message", (data) => {
    console.log("A received:", data);
});