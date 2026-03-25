
import { Router } from "express";
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";
import {
    addVideoToPlaylist, 
    createPlaylist, 
    deletePlaylist, 
    getPlaylistById, 
    getUserPlaylists, 
    removeVideoFromPlaylist, 
    updatePlaylist } from "../controllers/playlistController.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.use(jwtVerifyJWT)
router.route("/create-playList").post(createPlaylist)
router.route("/get-user-playLists/:userId").get(getUserPlaylists)
router.route("/get-playlist-byId/:playlistId").get(getPlaylistById)
router.route("/add-video/:playlistId/:videoId").post(addVideoToPlaylist)
router.route("/remove-video/:playlistId/:videoId").delete(removeVideoFromPlaylist)
router.route("/delete-playlist/:playlistId").delete(deletePlaylist)
router.route("/update-playList/:playlistId").patch(updatePlaylist)


export default router;