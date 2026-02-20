
import {Router} from "express"
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";
import { addNotification, getNotification, getNotificationCount } from "../controllers/notification.controller.js";

const router = Router();

router.use(jwtVerifyJWT);

router.route("/get-notification/:id").get(getNotification);
router.route("/add-notification/:id").post(addNotification);
router.route("/get-notification-count/:id").get(getNotificationCount);


export default router;