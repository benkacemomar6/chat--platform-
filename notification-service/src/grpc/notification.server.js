const grpc =
    require("@grpc/grpc-js");

const protoLoader =
    require("@grpc/proto-loader");

const path =
    require("path");

const {
    getNotifications,
    markAsRead
} =
    require(
        "../controllers/notification.controller"
    );

const PROTO_PATH =
    path.join(
        __dirname,
        "../../../shared/proto/notification.proto"
    );

const packageDefinition =
    protoLoader.loadSync(
        PROTO_PATH
    );

const notificationProto =
    grpc.loadPackageDefinition(
        packageDefinition
    ).notification;

function startGrpcServer() {
    const server =
        new grpc.Server();

    server.addService(
        notificationProto
            .NotificationService
            .service,
        {
            getNotifications,
            markAsRead
        }
    );

    const port =
        process.env.GRPC_PORT ||
        50054;

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials
            .createInsecure(),
        () => {
            console.log(
                `Notification gRPC server running on port ${port}`
            );
        }
    );
}

module.exports =
    startGrpcServer;