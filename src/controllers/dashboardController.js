

import { Video } from "../models/video.model.js"
import mongoose from "mongoose"
import { ApiResponse} from "../utils/ApiResponse.js"
import { ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Subscription } from "../models/subscriber.model.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
// 
    // const videos = await Video.find({
    //     owner: new mongoose.Types.ObjectId(req.user?._id)
    // })

    const {channelId} = req.params;
    const updatedChannelId = channelId.trim()

    if (!channelId) {
        throw new ApiError(404, "Channel can not be find")
    }

    const videoDetails = await Video.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(updatedChannelId)
            }
        },
       { 
        $group:{
            _id:null,
            totalVideos:{$sum:1},
            totalViews: {$sum: "$views"},
            totalLikes: {$sum: "$likes"}

        }
    }
    ])

    if (!videoDetails) {
        throw new ApiError(500, "VideoDetails can not provided")
    }

    const totalSubscriber = await Subscription.countDocuments({
        channel:updatedChannelId
    })

    const totalSubcrcibedChannel = await Subscription.countDocuments({
        subscriber:updatedChannelId
    })

    
    return res
            .status(200)
            .json(
                new ApiResponse(200, {
                    totalVideos: videoDetails[0]?.totalVideos ||0,
                    toatalViews: videoDetails[0]?.toatalViews||0,
                    totalLikes: videoDetails[0]?.totalLikes||0,
                    totalSubscriber:totalSubscriber,
                    totalSubscribed:totalSubcrcibedChannel
                })
            )


})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    if (!req.user?._id) {
        throw new ApiError()
    }
    
    const videos = await Video.find({
        owner:new mongoose.Types.ObjectId(req.user?._id)
    })

    if (!videos) {
        throw new ApiError(500, "Video can not be find")
    }

    return res
            .status(200)
            .json(
                new ApiResponse(200, videos, true, "Videos is succesfully fetched")
            )


})

export {
    getChannelStats,
    getChannelVideos
}























// Find the total views of all videos uploaded by a particular channel/user.

// Count the total number of subscribers the channel has.

// Count total videos uploaded by that channel.

// Sum total likes on all videos (or on channel, if stored separately).

// Basically, it’s meant to return summary statistics for a channel.