import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_KEY, 
    api_key: process.env.CLOUDINARY_API-KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        // upload on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // file has been uploaded 
        console.log("file is uploaded on cloudinary :",response.url)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the locally temporary saved file when the upload operation got failed
    }
}

export {uploadOnCloudinary}