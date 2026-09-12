const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(
    __dirname,
    "../../../shared/proto/user.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const userProto =
    grpc.loadPackageDefinition(packageDefinition).user;

const userClient = new userProto.UserService(
    process.env.USER_GRPC_URL || "localhost:50052",
    grpc.credentials.createInsecure()
);

module.exports = userClient;