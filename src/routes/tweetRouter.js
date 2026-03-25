
import { Router } from "express";
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet
} from "../controllers/tweetController.js";
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.use(jwtVerifyJWT)
router.route("/add-tweet").post(createTweet)
router.route("/get-all-tweet").get(getUserTweets)
router.route("/update-tweet/:tweetId").patch(updateTweet)
router.route("/delete-tweet/:tweetId").delete(deleteTweet)



export default router;