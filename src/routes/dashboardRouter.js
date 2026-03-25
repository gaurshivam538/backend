
import { Router } from "express";
import {
    getChannelStats,
    getChannelVideos
} from "../controllers/dashboardController.js";


const router = Router();

router.route("/get-channel-status/:channelId").get(getChannelStats)
router.route("/get-channel-allvideos").get(getChannelVideos)


export default router;