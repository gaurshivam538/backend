
import { Router } from "express";
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment
} from "../controllers/commentController.js";
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(jwtVerifyJWT)
router.route("/get-video-comments/:videoId")
    .get(getVideoComments)
router.route("/add-comment/:videoId")
    .post(addComment)
router.route("/delete-comment/:commentId")
    .delete(deleteComment)
router.route("/update-comment/:commentId")
    .patch(updateComment);

    export default router;