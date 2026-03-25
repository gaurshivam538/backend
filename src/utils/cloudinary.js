
import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import dotenv from "dotenv"
dotenv.config()



cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});


const uploadOnCloudinary = async (localFilePath) => {
 if (!localFilePath) {
      console.log(" No file path provided for Cloudinary upload.");
      return null;
    }
  try {
   
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("respones ",response)
    
    if(fs.existsSync(localFilePath)){
      fs.unlinkSync(localFilePath)
    }
    return response;

  } catch (error) {
    console.error(" Cloudinary upload failed:", error.message);

    // Only try to delete the file if it exists
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
};



export {uploadOnCloudinary}
