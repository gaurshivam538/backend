
import { Router } from "express"
import {
    getLikeAndDislikeStatus,
    getLikedVideos,
    toggleCommentReaction,
    toggleVideoReaction,
    getLikeAndDislikeStatusForComment
} from "../controllers/likeController.js";
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.use(jwtVerifyJWT)
router.route("/v/toggle-like/:videoId").post(toggleVideoReaction)
router.route("/c/toggle-like/:commentId").post(toggleCommentReaction)
router.route("/v/get-status/:videoId").get(getLikeAndDislikeStatus)
router.route("/c/get-status/:videoId").get(getLikeAndDislikeStatusForComment);
router.route("/v/get-allliked-video").get(getLikedVideos)
export default router;