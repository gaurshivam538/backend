
import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";


const toggleVideoReaction = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const video = await Video.findById(req.params.videoId).session(session);
    if (!video) throw new ApiError(404, "Video not found");

    const existingReaction = await Like.findOne({
      video: req.params.videoId,
      likedBy: req.user._id
    }).session(session);

    // SAME REACTION → REMOVE
    if (existingReaction && existingReaction.reaction === req.body.userReaction) {
      await Like.deleteOne({ _id: existingReaction._id }).session(session);

      await Video.updateOne(
        { _id: req.params.videoId },
        {
          $inc: {
            likes: req.body.userReaction === "like" ? -1 : 0,
            dislike: req.body.userReaction === "dislike" ? -1 : 0
          }
        }
      ).session(session);

      await session.commitTransaction();
      return res.status(200).json(
        new ApiResponse(
          200, 
          "Reaction Removed"
        )
        );
    }

    // SWITCH REACTION
    if (existingReaction) {
      const prev = existingReaction.reaction;

      await Like.updateOne(
        { _id: existingReaction._id },
        { reaction: req.body.userReaction }
      ).session(session);

      let likesInc = 0;
      let dislikeInc = 0;

      if (prev === "like" && req.body.userReaction === "dislike") {
        likesInc = -1;
        dislikeInc = 1;
      }

      if (prev === "dislike" && req.body.userReaction === "like") {
        likesInc = 1;
        dislikeInc = -1;
      }

      await Video.updateOne(
        { _id: req.params.videoId },
        { $inc: { likes: likesInc, dislike: dislikeInc } }
      ).session(session);

      await session.commitTransaction();
      return res.status(200).json(
        new ApiResponse(200, "Reaction Switched")
       );
    }

    // FIRST TIME REACTION
    const like = await Like.create(
      [{
        video: req.params.videoId,
        likedBy: req.user._id,
        reaction: req.body.userReaction
      }],
      { session }
    );

    await Video.updateOne(
      { _id: req.params.videoId },
      {
        $inc: {
          likes: req.body.userReaction === "like" ? 1 : 0,
          dislike: req.body.userReaction === "dislike" ? 1 : 0
        }
      }
    ).session(session);

    await session.commitTransaction();
    return res.status(200).json(
      new ApiResponse(201, like, "Reaction Created" )
    );

  } catch (err) {
    await session.abortTransaction();
    throw new ApiError( 404, err, "Video Reaction can not addded");
  } finally {
    session.endSession();
  }
});



const getLikeAndDislikeStatus = asyncHandler(async (req, res) =>{
   try {
    const {videoId} = req.params;
    const userId = req.user._id;
    let reaction = null;

    const existingReaction = await Like.findOne({
      video: new mongoose.Types.ObjectId(videoId),
      likedBy: new mongoose.Types.ObjectId(userId),
    });

    if (!existingReaction) {
      return res.status(200)
      .json(
        new ApiResponse(404,
          reaction
        )
      )
    }

    if (existingReaction) {
      reaction = existingReaction.reaction;
    }

    return res.status(200)
    .json(
      new ApiResponse(
        200,
        reaction
      )
    );

   } catch (error) {
    throw new ApiError(404, "User status can not be catch for the internal mistake");
   }
})


const toggleCommentLike = asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.params
    //TODO: toggle like on comment
const cleanId = commentId.trim();
  
const comment = await Comment.findById(
  cleanId
 );
   

    const existingComment = await Like.findOne(
      { comment: new mongoose.Types.ObjectId(cleanId) ,
       likedBy: new mongoose.Types.ObjectId(req.user._id) }
    )

    if (existingComment) {
    console.log(existingComment)
      
    }
   
    if (existingComment) {
      await Like.deleteOne(
        {
          _id: new mongoose.Types.ObjectId(existingComment._id)
        }
        
      )

      comment.likes = Math.max((comment.likes - 1), 0)
      const commentdetails = await comment.save({ validationBeforeSave: false })

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {
              commentdetails
            },
            true, "Comment Unliked")
        )
    } else {
      const newLike = await Like.create(
        { comment: new mongoose.Types.ObjectId(cleanId) ,
         likedBy: new mongoose.Types.ObjectId(req.user._id) }
      )
      comment.likes = comment.likes + 1;

      const commentdetails = await comment.save({ validationBeforeSave: false });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {
              newLike,
              commentdetails
            },
            "Comment is successfully liked"
          )
        )
    }
  } catch (error) {
    throw new ApiError(
      500,
      error?.message,
      "Comment can not be liked for internal mistake"
    )
  }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params
  //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  try {
    const userId = req.user._id;

    const allLikedItems = await Like.find(
      { likedBy: userId, video: { $ne: null } }  // find likes where video exists
    ).select("video");
    console.log(allLikedItems)

    const allVideoIds = allLikedItems.map((field) => field.video)
    console.log(allVideoIds)
    const video = await Video.find(
      {
        _id: { $in: allVideoIds }//dollor in treates
      });
    return res
      .status(200)
      .json(
        new ApiResponse(200,
          video,
          "Get all videos"
        )
      )

  } catch (error) {
    throw new ApiError(500, error?.message, "Video can not be get")
  }
})


export {
  toggleVideoReaction,
  toggleCommentLike,
  getLikedVideos,
  getLikeAndDislikeStatus

}