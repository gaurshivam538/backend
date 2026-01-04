
import { Router } from "express"
import {
    getLikeAndDislikeStatus,
    getLikedVideos,
    toggleCommentLike,
    toggleVideoReaction
} from "../controllers/likeController.js";
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.use(jwtVerifyJWT)
router.route("/v/toggle-like/:videoId").post(toggleVideoReaction)
router.route("/c/toogle-like/:commentId").post(toggleCommentLike)
router.route("/v/get-status/:videoId").get(getLikeAndDislikeStatus)
router.route("/v/get-allliked-video").get(getLikedVideos)
export default router;