const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const {getProfile} = require("../controllers/getProfile");
const {updateProfile}= require("../controllers/updateProfile")
const PROTO_PATH =path.join (
    __dirname,
    "../../../shared/proto/user.proto"
)
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const userProto =
    grpc.loadPackageDefinition(packageDefinition).user;
function startGrpcServer() {
    const server = new grpc.Server();

    server.addService(
        userProto.UserService.service,
        {
            getProfile,
            updateProfile
        }
    );
    const port = process.env.GRPC_PORT || "50052";
    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, boundPort) => {
            if (error) {
                console.error(
                    "Failed to start User gRPC server:",
                    error
                );
                return;
            }

            console.log(
                `User gRPC server running on port ${boundPort}`
            );
        }
    );
}

module.exports = startGrpcServer;