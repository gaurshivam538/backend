import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIo } from "../../socketserver.js"
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        const { page = 1, limit = 100 } = req.query
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
                                _id: 1,
                                fullName: 1,
                                username: 1,
                                avatar: 1,
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
                    parentComment: 1,
                    video: 1,
                    owner: 1,
                    likes: 1,
                    isDeleted: 1,
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
        const { content, commentId } = req.body;
        const { videoId } = req.params


        if (!content) {
            throw new ApiError(401, "Content field is required")
        }

        const comment = await Comment.create({
            content: content,
            video: videoId,
            owner: req.user?._id,
            parentComment: commentId || null
        })
        // console.log(comment);

        if (!comment) {
            throw new ApiError(500, "Something went wrong uploading the comment")
        }


        const populatedComment = await Comment.findById(comment._id)
            .populate("owner", "username fullName avatar");
        const io = getIo();

        io.to(`video_${videoId}`).emit("newComment", populatedComment);

        return res
            .status(200)
            .json(
                new ApiResponse(201, populatedComment, true, "Comment is successfully uploaded")
            )
    } catch (error) {
        throw new ApiError(404, error?.message, "Comment can not be uploaded")
    }
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    try {
        const { commentId } = req.params;
        const { content, videoId } = req.body;

        if (!content) {
            throw new ApiError(401, "Content is required")
        }

        if (!commentId && !videoId) {
            throw new ApiError(401, "Comment Id and Video Id is required for updating the comment")
        }

        const comment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content: content,
                }
            },
              { new: true }//This take the new updated data without this they can take the old not updated data
        )

         if (!comment) {
            throw new ApiError(500, "Comment can not be find")
        }
        const io = getIo();

     io.to(`video_${videoId}`).emit("update-comment", {
        content:comment?.content,
        commentId:comment._id
     });
        return res
            .status(200)
            .json(
                new ApiResponse(200, comment, true, "Commnet is successfully updated")
            )
    } catch (error) {
        throw new ApiError(404, error?.message, "Comment can not updated")
    }
});

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    const userId = req.user._id;
    const { videoId } = req.body;
    const session = await mongoose.startSession();
    const io = getIo();
    session.startTransaction();
    try {

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            throw new ApiError(400, "Invalid comment id");
        }

        if (!videoId || !commentId) {
            throw new ApiError(404, "Please Take the commentId and videoId");
        }

        const com = await Comment.findById(commentId).session(session);

        if (!com) {
            throw new ApiError(404, "Comment can not find").session(session);
        }

        const parentComment = await Comment.find({
            parentComment: new mongoose.Types.ObjectId(commentId)
        });


        const video = await Video.findById(videoId).session(session);

        if (!video) {
            throw new ApiError(404, "Video can not find").session(session);
        }

        if (video.owner.toString() === userId.toString()) {

            const comment = await Comment.find(
                {
                    $or: [
                        {

                            _id: new mongoose.Types.ObjectId(commentId),
                        },
                        {
                            parentComment: new mongoose.Types.ObjectId(commentId),
                        }
                    ]
                }
            ).select("_id").session(session);

            const commentIds = comment.map((r) => r._id);

            await Like.deleteMany(
                {
                    comment: { $in: commentIds },//$in synatax behave the ->this reed the commnetIds in one by one and match the comment the commentIds value match then remeove the like 
                }
            ).session(session);

            await Comment.deleteMany(
                {
                    $or: [
                        {

                            _id: new mongoose.Types.ObjectId(commentId),
                        },
                        {
                            parentComment: new mongoose.Types.ObjectId(commentId),
                        }
                    ]
                }
            ).session(session);

            io.to(`video_${videoId}`).emit("hard-delete-comment", commentId);

            await session.commitTransaction();

            return res.status(200)
                .json(
                    new ApiResponse(
                        200,
                        "Comment and child comments and snd likes and subLikes is successfully delete"
                    )
                )

        }

        if (video.owner.toString() !== userId.toString() && parentComment.length > 0) {
            if (com.owner.toString() !== userId.toString()) {
                throw new ApiError(403, "You are not allowed to delete this comment");
            }
            //403 error means-> the web server understood your request but refused to grant access to the requested page or resource.

            await Like.deleteMany({
                comment: commentId
            }).session(session);

            const softDeletedComment = await Comment.findByIdAndUpdate(
                com._id,
                {
                    $set: {
                        isDeleted: true,
                        content: "This comment was deleted"
                    }
                },
                { session }
            )

            io.to(`video_${videoId}`).emit("soft-delete-comment", {
                commentId: com._id,  // keep this as commentId
                content: softDeletedComment?.content,
                isDeleted: softDeletedComment?.isDeleted
            });


            await session.commitTransaction();
            return res.status(200)
                .json(
                    new ApiResponse(
                        200, softDeletedComment, "Comment is successfully soft deleted"
                    )
                )
        }
        if (video.owner.toString() !== userId.toString() && parentComment.length === 0) {

            if (com.owner.toString() !== userId.toString()) {
                throw new ApiError(403, "You are not allowed to delete this comment");
            }

            await Like.deleteMany({
                video: new mongoose.Types.ObjectId(videoId),
                comment: new mongoose.Types.ObjectId(commentId)
            }).session(session);

            await Comment.findByIdAndDelete({
                _id: new mongoose.Types.ObjectId(commentId)
            }).session(session);

            io.to(`video_${videoId}`).emit("hard-delete-comment", commentId);
            await session.commitTransaction();
            return res.status(200)
                .json(
                    new ApiResponse(
                        200, "Comment is successfully delete"
                    )
                )
        }


    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(404, error, "Comment can not delete")
    } finally {
        session.endSession();
    }

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment

}