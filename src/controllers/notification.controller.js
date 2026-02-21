
import { Notification } from "../models/notification.model.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscriber.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIo } from "../../socketserver.js";

const getNotificationCount = asyncHandler(async(req, res) => {
    const userId = req?.user?._id;
    const {id} = req.params;

     if (userId.toString() !== id.toString()) {
        throw new ApiError(404, "Please take a corect userId")
    }
    
    const { type, entityType } = req.query;

     const unreadCount = await Notification.countDocuments({
        receiver: userId,
        type: type,
        isRead: false,
        entityType: entityType
    });

    return res.status(200)
    .json(
        new ApiResponse(
            200, {
                unreadCount: Number(unreadCount)}, "Unread count is successfully fetchd"
        )
    );
});

const getNotification = asyncHandler(async (req, res, next) => {
    const userId = req?.user?._id;
    const {id} = req.params;

    if (userId.toString() !== id.toString()) {
        throw new ApiError(404, "Please take a corect userId")
    }

    const { type, entityType, page = 1, limit = 2 } = req.query;
    const skip = (page - 1) * limit;

    if (!userId) {
        throw new ApiError(404, "User can not find");
    }

    const notifications = await Notification.find({
        receiver: userId,
        type: type,
        entityType: entityType
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));


    const unreadCount = await Notification.countDocuments({
        receiver: userId,
        type: type,
        isRead: false,
        entityType: entityType
    });

    return res.status(200)
        .json(
            new ApiResponse(200, {
                notifications: notifications,
                unreadCount: Number(unreadCount) || 0,
            },
                "Notifiations Successfully find"
            )
        );

});

const addNotification = asyncHandler(async (req, res) => {
    const sender = req.user?._id;
    const { type, entityId, entityType, title, message, thumbnail, senderAvatar } = req.body;
    const {id} = req.params;

    if (sender.toString() !== id.toString()) {
        throw new ApiError(404, "Please take a corect userId")
    }

    // if (!title || !message) {
    //     throw new ApiError(404, "Please take the one more field")
    // }
    const io = getIo();

    const receiverIds = await Subscription.find({
        channel: sender
    }).select(" -_id subscriber");

    if (receiverIds.length > 0) {
        const notifications = await Promise.all(
            receiverIds.map((subscriber) =>
                Notification.create({
                    receiver: subscriber.subscriber,
                    sender: sender,
                    type: String(type).toUpperCase(),
                    entityId: entityId,
                    entityType: String(entityType).toUpperCase(),
                    title: title || "",
                    message: message || "",
                    thumbnail: thumbnail || "",
                    senderAvatar: senderAvatar || "",

                })
            )
        )

        receiverIds.map((subscriber) =>(
            io.to(`notification_${subscriber.subscriber}`).emit("notification:newVideo",
                {
                    message:`${req?.user?.username} ne ak nayi video upload ke `,
                    sender:sender,
                    type:String(type).toUpperCase(),
                    entityId:entityId,
                    entityType:entityType,
                    title: title || "",
                    // message: message || "",
                    thumbnail: thumbnail || "",
                    senderAvatar: senderAvatar || "",
                    isRead: false,
                }
            )
        ));

        return res.status(201)
        .json(
        new ApiResponse(201, notifications, "Notifications is successfully created")
        )
    }

});

export {
    getNotification,
    addNotification,
    getNotificationCount
}