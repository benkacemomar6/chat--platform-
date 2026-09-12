const { io } = require("socket.io-client");

const socket = io("http://localhost:4000",{
    auth:{
        token:"PASTE_YOUR_JWT_HERE"
    }

});

socket.on("connect", () => {
     console.log("Connected to server");
    console.log("B connected:", socket.id);

    socket.emit("join_room", {
        roomId: "room-1"
    });
});

socket.on("room_message", (data) => {
    console.log("B received:", data);
});