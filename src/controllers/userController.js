import { v4 as uuidv4 } from "uuid";
import axios from "axios"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import nodemailer from "nodemailer";
import NodeCache from "node-cache";
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import oauth2Client from "../utils/googleConfig.js"

const registerUser = asyncHandler(async (req, res) => {
    //This is the algorithm ofthe code
    // get user details from frontend
    // validation- not empty
    //check if user already exists:username,email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return res


    try {
        const { username, email, password, fullName } = req.body



        if (
            [fullName, username, email, password].some((field) =>
                field?.trim() === "")
        ) {
            throw new ApiError(400, "All fields are required")
        }

        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (existedUser) {
            throw new ApiError(409, "User with email or username is already exist")
        }
        console.log(req.files)

        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "avatar file is required")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if (!avatar) {
            throw new ApiError(400, "Avatar file is required")
        }
        const userCreatedUsername = `@${username.toLowerCase()}`;

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: userCreatedUsername,
            isNormalUser: true

        })

        const createdUser = await User.findById(user._id).select(
            " -refreshToken"
        )

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong registring the user")
        }

        return res.status(200)
            .json(
                new ApiResponse(201, createdUser, "user registered Successfully")
            )
    } catch (error) {
        throw new ApiError(500, error?.message, "user is not registered")
    }

})

const registerUserForGoogle = async (req, res) => {
    const { code } = req.body;

    if (!code) {
        throw new ApiError(401, "Code can not provide")
    }

    try {

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const userInfo = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`

                },
            },
        );

        const { email, name, picture } = userInfo.data;
        if (!userInfo) {
            throw new ApiError(401, "UserInfo can not provide");
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(200)
                .json(
                    new ApiResponse(200, "User is allready exist please login and use the available resouces")
                )
        }

        if (!existingUser) {

            let tempUsername = name.toLowerCase().replace(/[^a-z0-9]/g, "_");

            const shortId = uuidv4().slice(0, 6);

            tempUsername = `${tempUsername}_${shortId}`


            const user = await User.create({
                fullName: name,
                avatar: picture,
                email: email,
                coverImage: "",
                isTemporaryUserName: true,
                isGoogleUser: true,
                username: tempUsername

            })
            return res.status(200)
                .json(
                    new ApiResponse(201, user, "Google user is successfully created")
                )


        }

    } catch (error) {
        console.log(error)
    }
}

const generateAccessTokenAndRefresh = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }

}

const afterRedirectForSignupLogin = asyncHandler(async (req, res) => {

    const { email } = req.body;

    if (!email) {
        throw new ApiError(404, "Email is required")
    }

    try {

        const user = await User.findOne({
            email: email,
        });

        if (!user) {
            throw new ApiError(401, "User can not find")
        }

        if (user.isGoogleUser === false) {
            throw new ApiError(404, "There is no google account for this email for my history please signup for the google for my platform then login")
        }

        if (user.isGoogleUser) {

            const { accessToken, refreshToken } = await generateAccessTokenAndRefresh(user?._id);

            const loggedInUser = await User.findById(user._id).select(" -refreshToken");

            const options = {
                httpOnly: true,
                secure: false,
            }

            res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json(
                    new ApiResponse(200, loggedInUser, "User is Successfully loggedIn")
                )

        }

    } catch (error) {
        throw new ApiError(404, "User loggedIn Successfully");
    }
});

const googleLogin = asyncHandler(async (req, res) => {

    const { code } = req.body;

    if (!code) {
        throw new ApiError(404, "Code cannot provide")
    }

    try {

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const userInfo = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`

                },
            },
        );

        const { email } = userInfo.data;

        if (!email) {
            throw new ApiError(401, "Email cannot provide please check...")
        }

        const user = await User.findOne({
            email: email,
        });

        if (!user) {
            throw new ApiError(401, "User can not find")
        }

        if (user.isGoogleUser === false) {
            throw new ApiError(404, "There is no google account for this email for my history please signup for the google for my platform then login")
        }

        if (user.isGoogleUser) {

            const { accessToken, refreshToken } = await generateAccessTokenAndRefresh(user?._id);

            const loggedInUser = await User.findById(user._id).select(" -refreshToken");

            const options = {
                httpOnly: true,
                secure: false,
            }

            res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json(
                    new ApiResponse(200, loggedInUser, "User is Successfully loggedIn")
                )

        }


    } catch (error) {
        throw new ApiError("401", "request does not passsed", error?.message)
    }
});


const loginUser = asyncHandler(async (req, res) => {
    // 1. req.body Data
    // 2. username or email check
    // 3. find the user
    // 4. password check
    // 5. accessToken and refreshToken create
    // 5. Send coookie

    try {
        const { email, password, username } = req.body;

        if (!email && !username) {
            throw new ApiError(400, "Username of email is required")
        }

        const user = await User.findOne({
            $or: [{ email }, { username }]
        })

        if (!user) {
            throw new ApiError(404, "User does not exist")
        }

        const isPasswordValid = await user.isPasswordCorrect(password)

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user crediantiald")
        }

        const { accessToken, refreshToken } = await generateAccessTokenAndRefresh(user._id)

        const loggedInUser = await User.findById(user._id).select(" -password -refreshToken")

        const options =
        {
            httpOnly: true,
            secure: false,   // localhost
            // sameSite: "lax"  // SAME SITE via proxy
        }

        res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user: loggedInUser,

                    },
                    "User logged in Successfully"
                )
            )


    } catch (error) {
        throw new ApiError("401", "request does not passsed", error?.message)
    }
})

const logoutUser = asyncHandler(async (req, res, next) => {
    //find the user using middleware
    //Delete the refreshToken save for database
    //delete the refresh and access token for the coookies and session
    //and removing the refreshToken for the database again save the data base refreshtoken is undefined

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User LoggedOut Successfully"
            )
        )
})

const refreshAccessToken = async (req, res) => {
    // 1. Take the refreshToken for the cookies
    // 2. check refreshtoken is receve or not
    // 3. third verify the refresh token 
    // 4. find the user for giving refreshtoken 
    // 5. find the value of the refreshtoken is save the database
    // 4. check the value of the database refreshToken and cookies refreshToken is same
    // 5. again call the genereateAccessTokenAndRefreshToken function and receve the value of the accessToken and refreshToken
    // 6. And again save the value of the receving accessToken and refreshToken for the cookies
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            return res.status(402)
            .json(
                new ApiResponse(402, "Refresh Token can not provide please login")
            )
           
        }

        const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        if (!decodedRefreshToken) {
           return res.status(402)
            .json(
                new ApiResponse(402, "Refresh Token Expiry please Login and create new token")
            )
        }

          const { accessToken, refreshToken } = await generateAccessTokenAndRefresh(decodedRefreshToken?._id);

         await User.findByIdAndUpdate(decodedRefreshToken?._id,
            {
                $set: {
                    refreshToken: refreshToken,
                }
            },
            {
                new: true,
            }
        ).select(" -password -refreshToken");

      

        const options = {
            httpOnly: true,
            secure: false,
            // sameSite: "lax"
        }
        res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(

                new ApiResponse(201,  [], true, "Access Token is created SuccessFully")
            )
    } catch (error) {
        throw new ApiError(401, error?.message, "After Expire the AccessToken in not generate again")
    }
}

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, true, "Current user fetched successfully")
        )
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // 1. Take the value of the oldPassword and newPassword for the req.body
    // 2. check the value of the olPassword and newPassword is provide or not
    // 3. Take the value of the user is req.user
    // 4. Database Query using the req.user._id
    // 5. Receve the value of the userCrediantiald and hold the value of varialbe
    // 6. Check the value of the user is recevinf and not
    // 7. and compare the database password to our oldPassword 
    // 8. Password is same to overwrite the value of the database is using the newPassword 
    // 9 . save the value of the password is database


    try {
        const { oldPassword, newPassword } = req.body

        if (!oldPassword || !newPassword) {
            throw new ApiError(401, "Fill the bothField oldPassword and newpassword")
        }

        const user = await User.findById(req.user?._id).select(" -refreshToken")

        if (!user) {
            throw new ApiError(404, "User is not provide for change the password")
        }

        const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid Password")
        }

        user.password = newPassword;

        await user.save({ validateBeforeSave: false })
        const afterchangingthePassword = await User.findById(user._id).select("-password -refreshToken")

        return res
            .status(200)
            .json(
                new ApiResponse(201, afterchangingthePassword, "Password is Updated Successfully")
            )
    } catch (error) {
        throw new ApiError(401, error?.message, "Password is not change")
    }

})

const updateAccoutDetails = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body

    if (!email || !fullName) {
        throw new ApiError(401, "User Crediantials is not provide the body")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                email,
                fullName
            }
        },
        {
            new: true
        }
    ).select(" -password -refreshToken",)

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, true, "Account Details is Updated")
        )

})

const updateAvatar = asyncHandler(async (req, res) => {
    // 1. Take the Localfile Path for req.file
    // 2. Check the value is localPath is provide or not
    // 3. upload the localFilePathfor cloudinary and receve the original url for the file
    // 4. check the value of the url is provide or not
    // 5. find the user for req.user._id and update the value of the avatatr is avatar.url and save the value

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(401, "Avatar file is Missing")
    }
    // TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading the avatar file in cloudianary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select(" -password -refreshToken ",)


    return res
        .status(200)
        .json(
            new ApiResponse(201, user, "Avatar file is SuccessFully Updated")
        )
})

const updateCoverImage = asyncHandler(async (req, res) => {
    // 1. Take the Localfile Path for req.file
    // 2. Check the value is localPath is provide or not
    // 3. upload the localFilePath for cloudinary and receve the original url for the file
    // 4. check the value of the url is provide or not
    // 5. find the user for req.user._id and update the value of the avatatr is coverImage.url and save the value

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(401, "coverImage file is Missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading the coverImage file in cloudianary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select(" -password -refreshToken ")


    return res
        .status(200)
        .json(
            new ApiResponse(201, user, "coverImage file is SuccessFully Updated")
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username.trim()) {
        throw new ApiError(401, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "vc",
                pipeline: [
                    {
                        $project: {
                            views: 1,
                            createdAt: 1,
                            title: 1,
                            category: 1,
                            videoFile: 1,
                            thumbnail: 1,
                        },
                    },
                ]

            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                videoCount: {
                    $size: "$vc"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,

                    }
                }
            },

        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                videoCount: 1,
                vc: 1,


            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not find")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], true, "User profile is fetched Successfully")
        )

})

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(200, user[0].watchHistory, true, "Watch hitory fetched successfully")
        )
})

const otpCache = new NodeCache({ stdTTL: 300 })

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
    }
});

const forgotPassword = async (req, res) => {

    try {
        const { email } = req.body;

        const user = await User.findOne(
            {
                email: email
            }
        );

        if (!user) {
            // throw new ApiError(404, "User not found. Please sign up first.");
           return res.status(404)
           .json(
              new ApiResponse(404,"User not found. Please sign up first." )
           )
        }

        const otp = Math.floor(100000 + Math.random() * 900000);

        otpCache.set(email, otp);

        await transporter.sendMail({
            from: process.env.USER_EMAIL,
            to: email,
            subject: "Your OTP for Pasword Reset",
            text: `Your OTP is ${otp}. It expired in 5 minutes`
        })



        return res
            .status(200)
            .json(
                new ApiResponse(200, "Otp is successflly send to the user email,")
            )

    } catch (error) {
        throw new ApiError(500, error?.message, "forgot-paswword request can not be send")
    }
}

const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const cachedOtp = otpCache.get(email);
    console.log(cachedOtp);

    if (!cachedOtp) {
        throw new ApiError(404, "Your email is incorrect for the otp getting")
    }

    if (parseInt(otp) !== cachedOtp) {
        throw new ApiError(
            404, "Your otp is mismatched"
        )
    }

    otpCache.del(email)
    const user = await User.findOne({
        email: email,
    });

    const token = jwt.sign({
        _id: user?._id,
        email: user?.email
    },
        process.env.OTP_TOKEN_SECRET,
        {
            expiresIn: process.env.OTP_TOKEN_EXPIRY
        }
    )

    const options = {
        httpOnly: true,
        secure: false
    }

    return res
        .status(200)
        .cookie("otp_token", token, options)
        .json(
            new ApiResponse(200, "Otp is successfully verify please set the new password")
        )

})

const updatePassword = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const verifyEmail = req.email;


    if (!email) {
        throw new ApiError(500, "Please Input a valid email")
    };

    if (email !== verifyEmail) {
        throw new ApiError(401, "Take the correct email for password updating ")
    };

    const user = await User.findOne({
        email: email,
    });


    user.password = password;

    const updatedUser = await user.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                true,
                "Password is successfully updated and user is successfully loggedIn"
            )
        )
})
const userProfileImage = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User Info can not provide")
    }


    const data = {
        userImage: user.avatar,
        username: user.username,
        userFullname: user.fullName,

    };
    if (!user.avatar) {
        throw new ApiError(401, "User Image can not provide");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                data,
                true,
                "Image is successfully provided"

            )
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccoutDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    forgotPassword,
    verifyOtp,
    updatePassword,
    userProfileImage,
    registerUserForGoogle,
    afterRedirectForSignupLogin,
    googleLogin

}
