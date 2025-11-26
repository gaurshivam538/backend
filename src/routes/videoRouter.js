
import { Router } from "express"
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishVideo,
    togglePublishStatus,
    updateVideo
} from "../controllers/videoController.js"
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router()
router.use(jwtVerifyJWT)

router.route("/get-all-files")
    .get(getAllVideos)

router.route("/upload-file")
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1
            },
            {
                name: "thumbnail",
                maxCount: 1,
            }
        ]),jwtVerifyJWT, publishVideo
    )
router.route("/get-specific-video/:videoId")
    .get(getVideoById)
router.route("/delete-video/:videoId")
    .delete(deleteVideo)
router.route("/toggling-status/:videoId")
    .patch(togglePublishStatus)
router.route("/update-video-details/:videoId")
    .patch(upload.single("thumbnail"), updateVideo)

export default router;