
import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
try {
        const {content} = req.body;
    
        if (!content) {
            throw new ApiError(401, "Content is required")
        }
    
        const tweet = await Tweet.create(
            {
                content:content,
                owner:req.user?._id
            }
        )
    
        if (!tweet) {
            throw new ApiError(404, "Something went wrong create the tweet") 
        }
    
        return res
                .status(200)
                .json(
                    new ApiResponse(200, tweet, true, "Tweet is successfully created")
                )
} catch (error) {
    throw new ApiError(404, error?.message, "Tweet can not be created")
}
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const userId = req.user?._id;

   const tweets =  await Tweet.find({owner: userId}).select("-owner -createdAt -updatedAt")

   if (tweets.lenght === 0) {
       throw new ApiError(404, "Twwet can not be find")
   } else {
   console.log("Tweet is successfully find",tweets)
   }
     

   return res
        .status(200)
        .json(
            new ApiResponse(200, tweets, true, "User issuccesfuly fetched")
        )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
   try {
     const {tweetId} = req.params;
     const {content} = req.body;
     console.log("content ",content)
 
     const updatedTweetId = tweetId.trim()
 
     if (!content) {
         throw new ApiError(404, "Content is required")
     }
    //  const tweet = await Tweet.find({
    //      _id: new mongoose.Types.ObjectId(updatedTweetId)
    //  });
 
    //  tweet.content = content;
 
 
    //  await tweet.save()

    const tweet = await Tweet.findByIdAndUpdate(
        updatedTweetId,

        {
            $set: {
                content: content,
            }
        },
        {
            $new:true
        }
    
    )
 
  
 
      return res 
             .status(200)
             .json(
                 new ApiResponse(200, tweet, true, "Tweet is successfully updated")
             )
 
   } catch (error) {
      throw new ApiError(500, error?.message, "Twet an not e updated")
   }

    // const tweet = await Tweet.aggregate([
    //     {
    //         $match: {
    //             _id: new mongoose.Types.ObjectId(tweetId)
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: "users",
    //             localField: owner,
    //             foreignField: _id,
    //             as:"owner",
    //             pipeline: [
    //                 {
    //                     $project: {
    //                         _id: 1,
    //                         username: 1
    //                     }
    //                 }
    //             ]
    //         }
    //     },
    //     {$unwind: "$owner"},
    //     {
    //         $project: {
    //             content: 1,
    //             owner: 1,
    //         }
    //     }


        

    // ])

   
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const {tweetId} = req.params;

    if (!tweetId) {
        throw new ApiError(404, "Tweet id can not be receved please select a specific tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res
            .status(200)
            .json(
            new ApiResponse(200, {}, "Tweet is successfully deleted")
            )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}