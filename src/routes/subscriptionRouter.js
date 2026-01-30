
import { Router } from "express";
import {
     getSubscribedChannels, 
     getUserChannelSubscribers,
     subscribedStatus, 
     toggleSubscription } from "../controllers/subscriberController.js";
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.use(jwtVerifyJWT)
router.route("/toggle-subscriber/:channelId").post(toggleSubscription)
router.route("/get-subscriber/:channelId").get(getUserChannelSubscribers)
router.route("/get-subscribed/:subscriberId").get(getSubscribedChannels)
router.route("/get-subscribed-status/:channelId").get(subscribedStatus)
export default router;