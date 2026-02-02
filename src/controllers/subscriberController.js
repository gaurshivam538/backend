import { isValidObjectId } from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { Subscription } from "../models/subscriber.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose from "mongoose"
import { getIo } from "../../socketserver.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user?._id
    const io = getIo();



    //  1. What is isValidObjectId->
    // isValidObjectId is a helper function from Mongoose that checks whether a given value is a valid MongoDB ObjectId or not.

    if (!isValidObjectId(channelId)) {
        throw new ApiError(500, "This is not a valid channelId")
    }

    if (channelId.toString() === subscriberId.toString()) {
        throw new ApiError(500, "You can not subscribed to yourself")
    }

    const existingSub = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    }
    )

    if (existingSub) {
        const deleteResult = await Subscription.deleteOne({
            _id: existingSub?._id
        })
        if (deleteResult.deletedCount != 1) {//deletedCount => mongoDB ka diya hua hai 
            throw new ApiError("401", "User unsubscribe action fail");
        }

        io.to(`user_${channelId}`).emit("subscriber:update",
            {
                subscriberId,
                action: "UNSUBSCRIBE"

            }
        );

        io.to(`user_${subscriberId}`).emit("subscription:update",{
            channelId,
            action:"DECREMENT",
        })
        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, true, "Unsubscribed Successfully")
            )
    } 
  
        const newSubscription = await Subscription.create(
            {
                subscriber: subscriberId,
                channel: channelId
            }
        )

        if (!newSubscription?._id) {
            throw new ApiError(404, "User subscriber action can not submitted")
        }

        io.to(`user_${channelId}`).emit("subscriber:update",
            {
                subscriberId,
                action: "SUBSCRIBE"

            }
        );

        io.to(`user_${subscriberId}`).emit("subscription:update",{
            channelId,
            action:"INCREMENT",
        });

        return res
            .status(200)
            .json(
                new ApiResponse(201, newSubscription, true, "Subscribed Successfully")
            )
    

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscriberDetails: { $ifNull: ["$subscriberDetails", []] }
            }
        },
        {
            $project: {
                _id: 1,
                subscriberId: { $arrayElemAt: ["$subscriberDetails._id", 0] },
                fullName: { $arrayElemAt: ["$subscriberDetails.fullName", 0] },
                username: { $arrayElemAt: ["$subscriberDetails.username", 0] },
                avatar: { $arrayElemAt: ["$subscriberDetails.avatar", 0] }
            }
        }
    ]);

    if (!subscribers || subscribers.length === 0) {
        throw new ApiError(404, "No subscribers found");
    }

    return res.status(200).json(
        new ApiResponse(200, subscribers, true, "Fetched Subscribers")
    );
});


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    try {
        const { subscriberId } = req.params

        const userSubscribedChannel = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(subscriberId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channelDetails",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1,
                            }
                        }
                    ]
                },

            },
            {
                $unwind: "$channelDetails"
            },
            {
                $project: {
                    _id: 0,
                    channelId: "$channelDetails._id",
                    fullName: "$channelDetails.fullName",
                    username: "$channelDetails.username",
                    avatar: "$channelDetails.avatar",
                }
            }

        ])

        if (!userSubscribedChannel) {
            throw new ApiError(500, "Subscribed  not find")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, userSubscribedChannel, true, "Subscribed channel found")
            )
    } catch (error) {
        throw new ApiError(500, error?.message, "subscribed can not find")
    }
})

const subscribedStatus = async (req, res) => {
    const {channelId} = req?.params;
    const subscriberId = req?.user?._id

    if (!subscriberId || !channelId) {
        throw new ApiError(500, "developer Mistake");
    }

    const existSub = await Subscription.findOne({
        channel:channelId,
        subscriber: subscriberId
    });

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                subscribed: !!existSub,
            },
            "Subscribed status fetched"
        )
    );

}

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
    subscribedStatus
}