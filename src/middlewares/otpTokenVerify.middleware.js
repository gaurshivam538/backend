import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";

const otpTokenVerify = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.otp_token || req.header("Authorization")?.replace("Bearer", "");

        if (!token) {
            throw new ApiError(401, "Otp token can not provided ")
        }

        const decodedToken = jwt.verify(token, process.env.OTP_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if (!user) {
          throw new ApiError(404, "User not found");

        }

        req.email = user?.email;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Otp token")
    }
})

export default otpTokenVerify;
