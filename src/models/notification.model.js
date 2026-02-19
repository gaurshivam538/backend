import mongoose from "mongoose";

const notificationSchema = new Schema(
    {
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        type: {
            type: String,
            enum: [
                "LIKE",
                "COMMENT",
                "SUBSCRIBE",
                "UPLOAD",
                "POST"
            ],
            required: true,
            index: true
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        entityType: {
            type: String,
            enum: ["VIDEO", "COMMENT", "CHANNEL", "POST"],
            required: true
        },
        title: {
            type: String,
        },

        message: {
            type: String,
        },

        thumbnail: {
            type: String,
        },
        senderAvatar: {
            type: String,
        },

        isRead: {
            type: Boolean,
            default: false,
            index: true
        },

        isImportant: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 60 * 2
        },
    },
);


export const Notification = mongoose.model("Notification", notificationSchema);