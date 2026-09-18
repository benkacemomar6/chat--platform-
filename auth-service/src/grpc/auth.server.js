const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const {
    register,
    login,
    verifyToken,
    refreshToken,
    logout,
    logoutAll
} = require("../controllers/auth.controller");

const PROTO_PATH = path.join(
    __dirname,
    "../../../shared/proto/auth.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const authProto =
    grpc.loadPackageDefinition(packageDefinition).auth;

function startGrpcServer() {
    const server = new grpc.Server();

    server.addService(
        authProto.AuthService.service,
        {
            register,
            login,
            verifyToken,
            refreshToken,
            logout,
            logoutAll
        }
    );

    const port = process.env.GRPC_PORT || "50051";

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, boundPort) => {
            if (error) {
                console.error(
                    "Failed to start Auth gRPC server:",
                    error
                );
                return;
            }

            console.log(
                `Auth gRPC server running on port ${boundPort}`
            );
        }
    );
}

module.exports = startGrpcServer;
