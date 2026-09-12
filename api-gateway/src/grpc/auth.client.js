const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(
    __dirname,
    "../../../shared/proto/auth.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const authProto =
    grpc.loadPackageDefinition(packageDefinition).auth;

const authClient = new authProto.AuthService(
    process.env.AUTH_GRPC_URL || "localhost:50051",
    grpc.credentials.createInsecure()
);

module.exports = authClient;