import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Playlist } from "../models/playlist.model.js"
import mongoose from "mongoose"

const createPlaylist = asyncHandler(async (req, res) => {
    try {
        const { name, description } = req.body
        console.log(name, description)

        //TODO: create playlist

        if (!name || !description) {
            throw new ApiError(401, "Email and Description is  required fill the all field")
        }

        const playlist = await Playlist.create({
            name: name,
            description: description,
            owner: req.user._id

        })

        if (!playlist) {
            throw new ApiError(500, "Playlist can not be created")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, playlist, true, "Playlist is successfully created")
            )
    } catch (error) {
        throw new ApiError(500, error?.message)
    }
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params
        //TODO: get user playlists
        // console.log(await Playlist.aggregate([{ $match: { owner: new mongoose.Types.ObjectId(userId) } }]))

        const playlists = await Playlist.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                thumbnail: 1,
                            }
                        }

                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                avatar: 1,
                                fullName: 1,
                            }
                        }
                    ]

                }
            },
            // {
            // //     $unwind: "$videos"
            // // },
            // // // {
            // // //     $unwind: "$owner"
            // // // },
            // {
            //     $addFields: {
            //         owner: {
            //             $arrayElemAt: ["$owner", 0]
            //         }
            //     }
            // },

            {
                $project: {
                    name: 1,
                    description: 1,
                    videos: 1,
                    owner: 1

                }
            }
        ])

        if (playlists.lenght === 0) {
            throw new ApiError(500, "PlayLists is not acheive ")
        }


        return res
            .status(200)
            .json(
                new ApiResponse(200, playlists, true, "PlayLists is successfully fetched")
            )
    } catch (error) {
        throw new ApiError(500, error?.message)
    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id

    const playList = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            thumbnail: 1,
                            video: 1,
                        }
                    }
                ]

            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            avatar: 1,
                            fullName: 1,
                        }
                    }
                ]

            }
        },
        {
            $unwind: "$videos"
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                owner: 1

            }
        }
    ])


    if (!playList) {
        throw new ApiError(404, "PlayList can not find")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playList[0], true, "Playlist is successfully find...")
        )

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params


    if (!playlistId || !videoId) {
        throw new ApiError(401, "Playlist ans video that i can add the  playlist is required")
    }



    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "PlayList con not find")
    }

    // if (playlist.videos.includes(new mongoose.Types.ObjectId(videoId))) {

    if (playlist.videos.some((id) => id.toString() === videoId.toString())) {//Some check the videoId  array this take when the single element ispresent in the array and not 
        throw new ApiError(401, "Video is allready include to the playlist that i can not include the single video in multiiple time")

    } else {
        // playlist.videos.push(videoId)//This syntax is correct but this is save the id for the database is strinf format

        playlist.videos.push(new mongoose.Types.ObjectId(videoId))
        const updatedPlaylist = await playlist.save()

        return res
            .status(200)
            .json(
                new ApiResponse(200, updatedPlaylist, true, "Video is successfully uploaded")
            );
    }

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist

    if (!playlistId || !videoId) {
        throw new ApiError(404, "I can delete your video of your playlist when the videoId and playListId is not provide")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "PlayList con not find")
    }



    if (playlist.videos.some((id) => id.toString() === videoId.toString())) {

        playlist.videos.pull(new mongoose.Types.ObjectId(videoId))
        const updetedPlaylist = playlist.save();

        if (!updetedPlaylist) {
            throw new ApiError(500, "Video can not be deleted for the playlist video section")
        }

        return res
            .status(200)
            // .json(200, updetedPlaylist, true, "Video is successfully deleted to the playList")//Json is return the single output without rapup the curlybraces
            .json(new ApiResponse(200, updetedPlaylist, true, "Successfully deleted the video"))

    }

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist

    if (!playlistId) {
        throw new ApiError(401, "Playlistid can not be found to the url")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, true, "Playlist is successfully deleted")
        )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    const updetedPlayList = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name,
                description: description
            }
        },
        {
            new: true,
        }
    )

    if (!updetedPlayList) {
        throw new ApiError(500, "PlayList can not be updated")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updetedPlayList, true, "Playlist is sccessfully uupdated")
        )

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}