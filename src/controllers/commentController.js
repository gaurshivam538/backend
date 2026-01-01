import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        const { page = 1, limit = 10 } = req.query
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);


        const comments = await Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "video",
                    pipeline: [
                        {
                            $project: {
                                _id: 1
                            }
                        }
                    ]
                },

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
                                _id: 1
                            }
                        }
                    ]
                }
            },
            { $unwind: "$video" }, //Without this owner Tke the value is Array format
            { $unwind: "$owner" },
            { $skip: (pageNum - 1) * limit },
            { $limit: limitNum },
            {
                $project: {
                    content: 1,
                    video: 1,
                    owner: 1,
                }
            }

        ])

        if (!comments) {
            throw new ApiError(500, "Comment can not found")
        }

        const totalComments = await Comment.countDocuments({
            video: new mongoose.Types.ObjectId(videoId)
        });

        const totalPages = Math.ceil(totalComments / limitNum);

        return res
            .status(200)
            .json(
                {
                    success: true,
                    totalComments,
                    totalPages,
                    currentPage: pageNum,
                    comments
                }
            )
    } catch (error) {
        throw new ApiError(404, error?.message, "Comment not found")
    }

})

const addComment = asyncHandler(async (req, res) => {
    try {
        const { content } = req.body;
        const { videoId } = req.params

        if (!content) {
            throw new ApiError(401, "Content field is required")
        }

        const comment = await Comment.create({
            content: content,
            video: videoId,
            owner: req.user?._id
        })

        if (!comment) {
            throw new ApiError(500, "Something went wrong uploading the comment")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(201, comment, true, "Comment is successfully uploaded")
            )
    } catch (error) {
        throw new ApiError(404, error?.message, "Comment can not be uploaded")
    }
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    try {
        const { commentId } = req.params;
        const { content } = req.body

        if (!content) {
            throw new ApiError(401, "Content is required")
        }

        const comment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content: content,
                }
            }
        )

        const updatingcommit = await Comment.findById(comment._id)

        if (!comment) {
            throw new ApiError(500, "Comment can not be find")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, updatingcommit, true, "Commnet is successfully updated")
            )
    } catch (error) {
        throw new ApiError(404, error?.message, "Comment can not updated")
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const { commentId } = req.params;

    await Comment.findByIdAndDelete(
        commentId
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, true, "Comment is successfully deleted")
        )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment

}