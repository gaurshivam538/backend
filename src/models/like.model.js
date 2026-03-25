
import mongoose, { Schema } from "mongoose";

const likeScheam = Schema(
    {
        video: {
            type:Schema.Types.ObjectId,
            ref:"Video"
        },
        comment: {
            type:Schema.Types.ObjectId,
            ref:"Comment",
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref:"Tweet"
        },
        likedBy: {
            type:Schema.Types.ObjectId,
            ref:"User"
        },
        reaction: {
            type: String,
            enum: ["like","dislike"],
            required:true,
        }

    },
    { timestamps: true }
)

export const Like = mongoose.model("Like", likeScheam)