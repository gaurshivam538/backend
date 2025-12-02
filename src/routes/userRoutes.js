
import { Router } from "express";
import {
  changeCurrentPassword,
  forgotPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccoutDetails,
  updateAvatar,
  updateCoverImage,
  updatePassword,
  userProfileImage,
  verifyOtp
} from "../controllers/userController.js";
import { upload } from "../middlewares/multer.middleware.js"
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";
const router = Router()


router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1
    },
    {
      name: "coverImage",
      maxCount: 1
    }
  ]),
  registerUser
)
router.route("/login").post(loginUser)
router.route("/forgot-password").post(forgotPassword)
router.route("/verify-otp").get(verifyOtp)
router.route("/update-password").patch(updatePassword)
router.route("/logout").post(jwtVerifyJWT, logoutUser)
router.route("/refresh-access-token").post(refreshAccessToken)
router.route("/change-password").post(jwtVerifyJWT, changeCurrentPassword)
router.route("/current-user").get(jwtVerifyJWT, getCurrentUser)
router.route("/update-account").patch(jwtVerifyJWT, updateAccoutDetails)
router.route("/update-avatar").patch(jwtVerifyJWT,upload.single("avatar"), updateAvatar
)
router.route("/update-coverImage").patch(jwtVerifyJWT,upload.single("coverImage"), updateCoverImage
)
router.route("/user-channel-profile/:username").get(jwtVerifyJWT, getUserChannelProfile)
router.route("/watch-history").post(jwtVerifyJWT, getWatchHistory)
router.route("/profile-image").get(jwtVerifyJWT, userProfileImage)


export default router;
