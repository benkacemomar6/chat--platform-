const { io } = require("socket.io-client");

const socket = io("http://localhost:4000", {
    auth: {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWE1NjUzOWFjZWEwMmVmZTM1OGUzZDAiLCJlbWFpbCI6Im9tYXIzdGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc4OTI5MDUwNSwiZXhwIjoxNzg5Mjk0MTA1fQ.b9hhiuB2SMZi_LAdkR17pxfZYAHGuRu_WkT64gC88oE"
    }
});

const conversationId = "6aa6683d0b09fdc0707d1dbe";

socket.on("connect", () => {
    console.log("A connected:", socket.id);

    socket.emit(
        "join_conversation",
        { conversationId },
        (response) => {
            console.log("A join:", response);

            if (response.success) {
                socket.emit(
                    "send_message",
                    {
                        conversationId,
                        content: "Hello from A"
                    },
                    (sendResponse) => {
                        console.log(
                            "A send result:",
                            sendResponse
                        );
                    }
                );
            }
        }
    );
});

socket.on("new_message", (message) => {
    console.log("A received:", message);
});

socket.on("connect_error", (err) => {
    console.log("A connection error:", err.message);
});