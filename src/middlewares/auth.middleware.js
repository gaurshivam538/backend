
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import dotenv from "dotenv"
import { error } from "console";
dotenv.config()


const jwtVerifyJWT = asyncHandler(async (req, res, next) => {
    // 1. find the accesstToken this save the cookies
    // 2. check the token is provide or not
    // 3. Again verify the token is same for accessToken for creating time
    // 4. Find the user Using the teke the ttoken for verification using the decodedToken__id
    // 5. Check the user is receved
    // 6. Next i am save the my finding userdetails for request
    // 7. again take the command for next()


   try {
   
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
 
     if (!token) {
         throw new ApiError(401, "Unauthorized request", error.message)
     }
 
     const decodedToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
     const user = await User.findById(decodedToken._id).select(" -password, -refreshToken")
 
     if(!user){
         throw new ApiError(401, "Invalid Access Token")
     }
 
     req.user = user
     next()
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid acces Token")
   }
})

export {
    jwtVerifyJWT
}