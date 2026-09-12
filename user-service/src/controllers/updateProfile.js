grpc = require("@grpc/grpc-js");
const mongoose = require("mongoose");
const UserProfile = require("../models/UserProfile");
async function updateProfile(call,callback) {
    try {
         const {
            userId,
            username,
            bio,
            avatarUrl
        } = call.request;
         if (!mongoose.Types.ObjectId.isValid(userId)) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Invalid userId"
            });
        }

        const profile = await UserProfile.findOne({
            userId
        });
           if (!profile) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Profile not found"
            });
        }

        if (username !== undefined && username !== "") {
            profile.username = username;
        }

        if (bio !== undefined) {
            profile.bio = bio;
        }

        if (avatarUrl !== undefined) {
            profile.avatarUrl = avatarUrl;
        }

        await profile.save();
         callback(null, {
            userId: profile.userId.toString(),
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl
        });

        
    } catch (error) {
         console.error("UpdateProfile error:", error);

        callback({
            code: grpc.status.INTERNAL,
            message: "Internal server error"
        });
        
    }

    
}
module.exports={updateProfile};