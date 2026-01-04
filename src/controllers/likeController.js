
import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";


const toggleVideoReaction = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    const {userReaction} = req.body;
    const userId = req.user._id;
    console.log(userReaction);

    const video = await Video.findOne({
      _id: videoId,

    });


    if (!video) {
      throw new ApiError(404, "Video can not be found")
    }

    const existingReaction = await Like.findOne({
      video: new mongoose.Types.ObjectId(videoId),
      likedBy: new mongoose.Types.ObjectId(userId)
    });

 

//   user clicks same reaction again → remove
    if (existingReaction && existingReaction.reaction === userReaction) {

      if(existingReaction.reaction =="like"){ 
        video.likes = Math.max((video.likes - 1), 0);
        }

      if(existingReaction.reaction == "dislike") {
        video.dislike = Math.max((video.dislike - 1), 0);
        }

      await Like.deleteOne({
        _id:existingReaction._id
      })

      await video.save();

      return res.status(200).json(
        new ApiResponse(200,
          {
            userAction:`user is toggle ${userReaction} reaction`,
           reaction:null
          },
          
          )
      );
     } 

//===========User switch next reaction===========//
     if (existingReaction) {

      const userbeforeReaction = existingReaction.reaction;

       if(existingReaction.reaction == "like"){
        video.likes = Math.max((video.likes - 1), 0)
      }

       if(existingReaction.dislike == "dislike") {
        video.dislike = Math.max((video.dislike- 1), 0);
       }
       
       existingReaction.reaction = userReaction;
       const existReaction = await existingReaction.save();

       if(userReaction == "like") video.likes++;
       if(userReaction == "dislike")video.dislike++;

       await video.save();

       return res.status(200)
       .json(
        new ApiResponse(200,
          {
            reaction: userReaction,
            userAction: `user is swithch the reaction ${userbeforeReaction} to ${existingReaction.reaction}`,
            existReaction
          }
        )
       )

     }

//============First time create==============//
     const newReaction = await Like.create({
      video: new mongoose.Types.ObjectId(videoId),
      likedBy: new mongoose.Types.ObjectId(userId),
      reaction:userReaction
     })

     if(userReaction == "like") video.likes++;
     if(userReaction == "dislike") video.dislike++;

     const videoDetails = await video.save();

     return res.status(201)
     .json(
      new ApiResponse(201, {
        videoDetails,
        Action: `User ${newReaction.reaction} action is successfully added`,
        newReaction
      })
     )

  } catch (error) {
    throw new ApiError(404, error?.message)
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
    console.log("jashaS")
      
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