import { Notification } from "../models/notification.model.js";
import { Subscription } from "../models/subscriber.model.js";
import { Video } from "../models/video.model.js";
import { View } from "../models/views.model.js";
import client from "../redis.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose"

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page,
        limit,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query;


    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const matchStage = {
        isPublished: true,
    };

    if (query) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }

    if (userId) {
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    const sortStage = {
        [sortBy]: sortType === "asc" ? 1 : -1,
    };
    const cacheKey = `videos:${pageNum}:${limitNum}:${query || "all"}:${sortBy}:${sortType}:${userId || "all"}`;
    const cachedData = await client.json.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(
            {
                ...cachedData,
                source: "redis"
            });
    }

    const videos = await Video.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        { $unwind: "$owner" },//this is transform the owner array to ownwer object
        { $sort: sortStage },
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
        {
            $project: {
                title: 1,
                videoFile: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                owner: 1,
                category: 1,
            },
        },
    ]);

    const totalVideos = await Video.countDocuments(matchStage);
    const totalPages = Math.ceil(totalVideos / limitNum);

    await client.json.set(
        cacheKey,
        "$",
        {
            success: true,
            totalVideos,
            totalPages,
            currentPage: pageNum,
            videos
        }
    );

    await client.expire(cacheKey, 600);
    return res.status(200).json({
        success: true,
        totalVideos,
        totalPages,
        currentPage: pageNum,
        videos,
    });
});


const publishVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description, category, isPublished } = req.body;

        if (!title || !description) {
            throw new ApiError(401, "Title and description is required")
        }

        if (isPublished == "") {
            throw new ApiError(401, "IsPublished is required")
        }

        const videoLocalPath = req.files?.videoFile[0]?.path;
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

        const videoCloud = await uploadOnCloudinary(videoLocalPath);
        const thumbnaiCloud = await uploadOnCloudinary(thumbnailLocalPath);

        console.log("video playpackurl is", videoCloud.playback_url);

        if (!videoCloud) {
            throw new ApiError(401, "Video file is required")
        }

        // if (!thumbnailLocalPath) {
        //     throw new ApiError(401, "Thumbnail file is required")
        // }

        const video = await Video.create({
            videoFile: videoCloud.playback_url,
            thumbnail: thumbnaiCloud?.url || "",
            owner: req.user._id,
            title: title,
            description: description,
            duration: videoCloud.duration,
            isPublished: true,
            format: videoCloud.format,
            category: category,

        })

        if (!video) {
            throw new ApiError(500, "Something went wrong uploading the video")

        }
        if (video) {
            client.del("videos:1:10:all:createdAt:desc:all");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(201, video, true, "Video is successfully uploaded")
            )



    } catch (error) {
        throw new ApiError(404, error?.message, "Video can not be uploaded")
    }

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req?.params;
    const { signal } = req.query;
    console.log(signal);

    try {

        let shouldIncreaseView = false;

        if (req.user?._id) {

            const existingView = await View.findOne({
                video: new mongoose.Types.ObjectId(videoId),
                viewedBy: new mongoose.Types.ObjectId(req.user?._id)
            })


            if (!existingView) {
                await View.create({
                    video: videoId,
                    viewedBy: req.user?._id,
                })
                shouldIncreaseView = true;

            }
        } else {
            shouldIncreaseView = true;
        }

        if (shouldIncreaseView) {
            await Video.findByIdAndUpdate(
                videoId, {
                $inc: { views: 1 }
            }
            )

            // if (signal.toString() === "randomVideo") {
            
            // }

            if (signal.toString() === "notificationVideo") {
                console.log("hai");
                
                await Notification.updateMany(
                    {
                        receiver: req.user._id,
                        entityId: videoId,
                        entityType: "VIDEO",
                        isRead: false
                    },
                    { $set: { isRead: true } }
                );
            }
        }

        const updatedVideo = await Video.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
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
            { $unwind: "$owner" },
            {
                $lookup: {
                    from: "comments",
                    localField: "_id",
                    foreignField: "video",
                    as: "commentInfo",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "userInfo",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1,

                                        }
                                    }
                                ]
                            }
                        },

                        {
                            $unwind: {
                                path: "$userInfo",
                                preserveNullAndEmptyArrays: true
                            }
                        },


                        {
                            $project: {
                                content: 1,
                                likes: 1,
                                createdAt: 1,
                                user: "$userInfo"
                            }
                        }
                    ]
                }
            },
            // { $unwind: "$commentInfo" },//Problem->when the unwind use then the my lookup take the null docement then the unwind destroy the all block drop 
            // {
            //     $unwind: {
            //         path: "$commentInfo",
            //         preserveNullAndEmptyArrays: true
            //     }
            // },


            {
                $addFields: {
                    commentInfo: {
                        $ifNull: ["$commentInfo", []] //check the commentInfo is null and not yadi null ho to replace karo empty array sa
                    }
                }
            },

            {
                $project: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    owner: 1,
                    likes: 1,
                    views: 1,
                    commentInfo: 1,
                    isPublished: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ])

        if (!updatedVideo) {
            throw new ApiError(500, "Updated video can not be found")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(201, updatedVideo, true, "Video is successfull find")
            )
    } catch (error) {
        throw new ApiError(404, error?.message, "Video can not be find")
    }

})


const deleteVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;

        if (!videoId) {
            throw new ApiError(401, "VideoId can not receve for deleting te video")
        }

        await Video.findByIdAndDelete(videoId)

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, true, "Video is successfully deleted")
            )
    } catch (error) {
        throw new ApiError(401, error?.message, "Video can not be deleted")
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        //TODO: update video details like title, description, thumbnail
        const { title, description } = req.body

        const thumbnailLocalPath = req.file?.path;

        if (!thumbnailLocalPath) {
            throw new ApiError(401, "thumbnail local filepath can not receved")
        }

        const thumbnailCloud = await uploadOnCloudinary(thumbnailLocalPath)

        if (!thumbnailCloud) {
            throw new ApiError(500, "Cloudianry fail tu upload the file")
        }


        const video = await Video.findByIdAndUpdate(
            videoId,
            {
                $set: {
                    thumbnail: thumbnailCloud.url,
                    title: title,
                    description: description,
                }
            }
        )

        if (!video) {
            throw new ApiError(404, "Video can not be find")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, video, true, "Video successfully updated")

            )
    } catch (error) {
        console.error(error)
        throw new ApiError(500, error.message || "Video details could not be updated")


    }

})


const togglePublishStatus = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params

        const video = await Video.findById(videoId)

        if (!video) {
            throw new ApiError(404, "Page not found")
        }

        video.isPublished = !isPublished;

        const AfterIsPublished = await video.save()

        return res
            .status(200)
            .json(
                new ApiResponse(201, AfterIsPublished, true, "IsPublished is Successfully toggele")
            )
    } catch (error) {
        throw new ApiError(401, {}, "PublishStatus can not be changed")
    }

})

const getVideoBySubscribedChannel = async (req, res) => {
    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(404, "ChanneId is required!");
    }

    // const videos = await Subscription.aggregate([
    //     {
    //         $match: {
    //             subscriber: new mongoose.Types.ObjectId(channelId)
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: "users",
    //             localField: "channel",
    //             foreignField: "_id",
    //             as: "channelDetails",
    //             pipeline: [
    //                 {
    //                     $lookup: {
    //                         from: "videos",
    //                         localField: "_id",
    //                         foreignField: "owner",
    //                         as: "VideoInfo",
    //                         pipeline: [
    //                             {
    //                                 $project: {
    //                                     _id: 1,
    //                                     videoFile: 1,
    //                                     thumbnail: 1,
    //                                     title: 1,
    //                                     description: 1,
    //                                     duration: 1,
    //                                     owner: 1,
    //                                     likes: 1,
    //                                     views: 1,
    //                                     createdAt: 1,
    //                                 }
    //                             }
    //                         ]
    //                     }
    //                 },
    //                 {
    //                     $addFields: {
    //                         VideoInfo: {
    //                             $ifNull: ["$VideoInfo"]
    //                         }
    //                     }
    //                 },
    //                 {
    //                     $project: {
    //                         _id: 1,
    //                         fullName: 1,
    //                         username: 1,
    //                         avatar: 1,
    //                         videos: "$VideoInfo",

    //                     }
    //                 }
    //             ]
    //         }
    //     },
    //     {
    //         $unwind: {
    //             path: "$channelDetails",
    //             preserveNullAndEmptyArrays: true,
    //         }
    //     },
    //     {
    //         $project: {

    //         }
    //     }

    // ])

    const videos = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "channel",
                foreignField: "owner",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "user",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $unwind: "$user",
                    },
                    {
                        $project: {
                            _id: 1,
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            owner: 1,
                            likes: 1,
                            views: 1,
                            createdAt: 1,
                            user: 1,
                        },
                    },
                ],
            },
        },

        //  array ko single document me convert
        {
            $unwind: "$video",
        },

        //  sirf video ko root bana diya
        {
            $replaceRoot: { newRoot: "$video" },
        },

        //  latest videos first
        {
            $sort: { createdAt: -1 },
        },
    ]);


    if (videos.length === 0) {
        return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    "There is no single video is available for the user"
                )
            )
    }

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                videos,
                "Video is sucessfully find"
            )
        )
}

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    deleteVideo,
    updateVideo,
    togglePublishStatus,
    getVideoBySubscribedChannel
}