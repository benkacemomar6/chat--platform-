const grpc =
    require("@grpc/grpc-js");

const protoLoader =
    require("@grpc/proto-loader");

const path =
    require("path");

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

const notificationClient =
    new notificationProto
        .NotificationService(
            process.env
                .NOTIFICATION_GRPC_URL ||
            "localhost:50054",

            grpc.credentials
                .createInsecure()
        );

module.exports =
    notificationClient;