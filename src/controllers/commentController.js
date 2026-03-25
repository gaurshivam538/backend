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
  const { videoId } = req.body;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  const session = await mongoose.startSession();
  const io = getIo();

  try {
    session.startTransaction();

    // 🔹 Find comment
    const comment = await Comment.findById(commentId).session(session);
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    // 🔹 Find video
    const video = await Video.findById(videoId).session(session);
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // 🔹 Helper: get all nested child comments (recursive)
    const getAllChildCommentIds = async (parentId) => {
      let ids = [];

      const children = await Comment.find(
        { parentComment: parentId },
        { _id: 1 }
      ).session(session);

      for (const child of children) {
        ids.push(child._id);
        const subChildren = await getAllChildCommentIds(child._id);
        ids.push(...subChildren);
      }

      return ids;
    };

    // ======================================================
    // 🔥 CASE 1: VIDEO OWNER → HARD DELETE EVERYTHING
    // ======================================================
    if (video.owner.toString() === userId.toString()) {
      const childIds = await getAllChildCommentIds(commentId);
      const allIds = [comment._id, ...childIds];

      await Like.deleteMany({
        comment: { $in: allIds },
      }).session(session);

      await Comment.deleteMany({
        _id: { $in: allIds },
      }).session(session);

      await session.commitTransaction();

      io.to(`video_${videoId}`).emit("hard-delete-comment", {
        commentId,
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          null,
          "Comment and all child comments deleted successfully"
        )
      );
    }

    // 🔹 Find if this comment has replies
    const hasReplies = await Comment.exists({
      parentComment: commentId,
    }).session(session);

    // ======================================================
    // 🔥 CASE 2: COMMENT OWNER + HAS REPLIES → SOFT DELETE
    // ======================================================
    if (hasReplies) {
      if (comment.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not allowed to delete this comment");
      }

      await Like.deleteMany({
        comment: commentId,
      }).session(session);

      const softDeleted = await Comment.findByIdAndUpdate(
        commentId,
        {
          $set: {
            isDeleted: true,
            content: "This comment was deleted",
          },
        },
        { new: true, session }
      );

      await session.commitTransaction();

      io.to(`video_${videoId}`).emit("soft-delete-comment", {
        commentId: softDeleted._id,
        content: softDeleted.content,
        isDeleted: softDeleted.isDeleted,
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          softDeleted,
          "Comment soft deleted successfully"
        )
      );
    }

    // ======================================================
    // 🔥 CASE 3: COMMENT OWNER + NO REPLIES → HARD DELETE
    // ======================================================
    if (comment.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "You are not allowed to delete this comment");
    }

    await Like.deleteMany({
      comment: commentId,
    }).session(session);

    await Comment.findByIdAndDelete(commentId).session(session);

    await session.commitTransaction();

    io.to(`video_${videoId}`).emit("hard-delete-comment", {
      commentId,
    });

    return res.status(200).json(
      new ApiResponse(200, null, "Comment deleted successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment

}