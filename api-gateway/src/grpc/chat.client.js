const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(
    __dirname,
    "../../../shared/proto/chat.proto"
);

const packageDefinition =
    protoLoader.loadSync(PROTO_PATH);

const chatProto =
    grpc.loadPackageDefinition(packageDefinition).chat;

const chatClient =
    new chatProto.ChatService(
        process.env.CHAT_GRPC_URL || "localhost:50053",
        grpc.credentials.createInsecure()
    );

module.exports = chatClient;