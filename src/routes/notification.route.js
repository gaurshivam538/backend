
import {Router} from "express"
import { jwtVerifyJWT } from "../middlewares/auth.middleware.js";
import { addNotification, getNotification } from "../controllers/notification.controller.js";

const router = Router();

router.use(jwtVerifyJWT);

router.route("/get-notification/:id").get(getNotification);
router.route("/add-comment/:id").post(addNotification);
