
import mongoose, { set } from "mongoose";
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
      likedBy: req.user._id,
      comment: {$exists: false } // Isak means -> comment field bilkul present nahi honi chahiye
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
        reaction: req.body.userReaction,
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
      new ApiResponse(201, like, "Reaction Created")
    );

  } catch (err) {
    await session.abortTransaction();
    throw new ApiError(404, err, "Video Reaction can not addded");
  } finally {
    session.endSession();
  }
});



const getLikeAndDislikeStatus = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
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


const toggleCommentReaction = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    const { userReaction, videoId } = req.body;
    const userId = req.user._id;
    const cleanId = commentId.trim();

    const session = await mongoose.startSession();
    session.startTransaction();
    try {

      const comment = await Comment.findById(
        cleanId
      ).session(session);

      if (!comment) {
        throw new ApiError(404, "Comment can not find");
      }

      const existingReaction = await Like.findOne({
        comment: new mongoose.Types.ObjectId(cleanId),
        likedBy: new mongoose.Types.ObjectId(userId)
      }).session(session);

      if (existingReaction) {
        console.log( "ExistingReaction", existingReaction);
      }


      //=========User Click the same reaction ==========//
      if (existingReaction && existingReaction.reaction === userReaction) {

        await Like.deleteOne({ _id: existingReaction._id }).session(session);

        const updatedComment = await Comment.updateOne(
          { _id: cleanId},
          {
            $inc: {
              likes: userReaction == "like" ? -1 : 0,
              dislike: userReaction == "dislike" ? -1 : 0,
            }
          }
        ).session(session);
      await session.commitTransaction();

        return res.status(200)
          .json(
            new ApiResponse(201, updatedComment,`User Remove the ${userReaction} Reaction `)
          )
      }

      //============Switch Reaction=============//
      if (existingReaction) {
        const prevReaction = existingReaction.reaction;

        await Like.updateOne(
          { _id: existingReaction._id},
          {reaction: userReaction}
        ).session(session);

        let likesInc = 0;
        let dislikeInc = 0;

        if (prevReaction === "like" && userReaction === "dislike") {
          likesInc = -1;
          dislikeInc = 1;
        }

        if (prevReaction === "dislike" && userReaction === "like") {
          likesInc = 1;
          dislikeInc = -1;
        }

         const updatedComment = await Comment.updateOne(
          {_id: cleanId},
          {
            $inc: {likes: likesInc,
               dislike: dislikeInc}
          }
        ).session(session)

      await session.commitTransaction();

        return res.status(200)
        .json(
          new ApiResponse(
            201, updatedComment, `User switch the ${prevReaction} to ${userReaction}`
          )
        )
      }

      //==========First time create=========//

      const like = await Like.create(
        [{
          video: videoId,
          comment: commentId,
          likedBy: req.user._id,
          reaction: userReaction
        }],
        {session}
      );

      const updatedComment = await Comment.updateOne(
        {_id: commentId},
        {
          $inc: {
            likes: userReaction === "like" ? 1 : 0,
            dislike: userReaction === "dislike" ? 1 : 0
          }
        }
      ).session(session);

      await session.commitTransaction();

      return res.status(200)
      .json(
        new ApiResponse(
          201,  updatedComment, `User Successfully created a ${userReaction} reaction...`
        )
      )

    } catch (error) {
      await session.abortTransaction();
      throw new ApiError(404, "Comment Reaction Can not toggle", error)
    } finally {
      session.endSession();
    }

   
})

const getLikeAndDislikeStatusForComment = asyncHandler(async(req, res) => {
  const {videoId} = req.params;
  const userId = req.user._id;

  const comment = await Comment.find({
    video: new mongoose.Types.ObjectId(videoId),
  });

  if(!comment) {
    throw new ApiError(404, "Comment can not fetched")
  }

  const reactions = await Like.find({
    video: new mongoose.Types.ObjectId(videoId),
    likedBy: new mongoose.Types.ObjectId(userId),
    comment: {$exists: true, $ne: null}// comment present ho or null nahi ho
    
  }).select("comment reaction");// .select means -> sirf comment field bhejo


  if (!reactions) {
    throw new ApiError(404, "Reaction can not find")
  }

  // const likedSet = new Set(
  //   reactions.map((reaction) => reaction.comment.toString()),
  // )

  // const finalComment = comment.map((c) =>(
  //   {
  //     ...c._doc,
  //     isLiked: likedSet.has(c._id.toString()),// has means -> this return the true of false message 
  //   }
  // ))

  const reactionMap = new Map(
    reactions.map((r) => {
     return [ 
      r.comment.toString(),
      r.reaction
    ]
    })
  )
  //=========Explanation ====//
  //.map take this array format [["c1", "like"], ["c2", "dislike"]]  but the new Map transform this key and value format example 

//"c1" => "like" then simple to catching the value 
//=========End=====//

const finalComment = comment.map((c) => ({
  ...c._doc,
  userReaction: reactionMap.get(c._id.toString())|| null,
}));

return res.status(200)
.json(
  new ApiResponse(
    "200", finalComment, "Comment Reactions Successfully find "
  )
);

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
 toggleCommentReaction,
  getLikedVideos,
  getLikeAndDislikeStatus,
  getLikeAndDislikeStatusForComment

}