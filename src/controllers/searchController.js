import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js";


const searchbar = asyncHandler(async (req, res) => {
    const query = req.query.query?.trim();
    console.log(query)

    if (!query) {
        throw new ApiError(404, "Please enter the query when you want to search");
    }

    const result = await Promise.all([
        await Video.find({
            $or: [
                {
                    title: { $regex: query, $options: "i" }
                    //regex referse to find the all title to take the user input
                    //options-> receving the user input is transform the caseinsensitive
                },
                {
                    description: { $regex: query, $options: "i" }
                }
            ]
        }).limit(10)
    ])

    if (!result) {
        throw new ApiError(404, "Your query is not find please enter a valid query  that i can send the valid output")
    }

    return res
            .status(200)
            .json(
                new ApiResponse(
                    200, result, true, "Data is successfully find"
                )
            )
})


export {
    searchbar
}
