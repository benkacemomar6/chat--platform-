const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const {
    createConversation,
    getConversations,
    getMessages
} = require("../src/controllers/chat.controller");

const PROTO_PATH = path.join(
    __dirname,
    "../../shared/proto/chat.proto"
);

const packageDefinition =
    protoLoader.loadSync(PROTO_PATH);

const chatProto =
    grpc.loadPackageDefinition(packageDefinition).chat;

function startGrpcServer() {
    const server = new grpc.Server();

    server.addService(
        chatProto.ChatService.service,
        {
            createConversation,
            getConversations,
            getMessages
        }
    );

    const port = process.env.GRPC_PORT || 50053;

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        () => {
            console.log(
                `Chat gRPC server running on port ${port}`
            );
        }
    );
}

module.exports = startGrpcServer;