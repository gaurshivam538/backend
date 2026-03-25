
import mongoose,{Schema} from "mongoose";

const viewSchema = Schema({
    video: {
        type:Schema.Types.ObjectId,
        ref:"Video"
    },

    tweet: {
        type:Schema.Types.ObjectId,
        ref:"Tweet",
    },

    viewedBy: {
        type:Schema.Types.ObjectId,
        ref:"User"
    }
}, {timestamps: true})

export const View = mongoose.model("View", viewSchema);
