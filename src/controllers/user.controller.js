import {asynHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js "
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";


const registerUser = asynHandler(async(req,res)=>{
    // steps
    // get user details from frontend
    // validation - not empty
    // check if user already exist -- through username or email
    // check for images, check for avatar
    // upload them to cloudinary , and check avatar uploaded on cloudinary
    //  create user object - craete entry in db
    // remove password and refresh token token field from response 
    // check for user creation
    // return response

    const {username,fullName,email,password}=req.body;
    // console.log("email : ",email)
    // console.log("password : ",password)

    if(
        [username,fullName,email,password].some((field)=> field?.trim() === "")
    ){
        throw new ApiError (400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [ { username },{ email } ]
    })

    if (existedUser) {
        throw new ApiError (409,"user with username or email already exist")
    }

    console.log(req.files)
    
     const avatarLocalPath = req.files?.avatar[0]?.path;
    //  const coverImageLocalPath = req.files?.coverImage[0]?.path;

     let coverImageLocalPath;
     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath=req.files.coverImage[0].path;
        
     } 

     if(!avatarLocalPath){
        throw new ApiError (400, "Avatar file is required");
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath);
    
     const coverImage = await uploadOnCloudinary(coverImageLocalPath);

     if(!avatar){
        throw new ApiError (400, "Avatar file is required");
     }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
     })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError (500,"something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
})

const generateAccessAndRefreshToken =  async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500 , "something went wrong while generating access and refresh token")
    }
}

const loginUser = asynHandler(async (req,res)=>{
    // steps
    // collect data from req.body
    // username or email based login
    // find the user
    // password check
    // access and refresh token
    // send token with secure cookies

    const {username,email,password}=req.body

    if(!(username && email)){
        throw new ApiError(400 , "username or password is required")
    }


   const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError (404 ," user does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if(!isPasswordValid){
        throw new ApiError (401 ,"password incorrect")
    }

    const {accessToken,refreshToken}= await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse (
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User loggedin successfully"
        )
    )
})


const logoutUser =  asynHandler(async(req,res)=>{
   await User.findByIdAndDelete(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse (200,{},"User loggedout"))
})

const refreshAccessToken = asynHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
    const user = User.findById(decodedToken?._id)
    
    if(!user){
        throw new ApiError(401,"Invalid refresh token")
    }
    
    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"Refresh token expired or used")
    }
    
    const options={
        httpOnly:true,
        secure:true
    }
    
    const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        200,
        {
            accessToken,refreshAccessToken:newRefreshToken
        },
        "Access token refreshed"
    )
} catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
}

})

const changeCurrentUserPassword =  asynHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Passowrd changed successfully")
    )
}) 

const getCurrentUser =  asynHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse (200,req.user ,"current fetched successfully"))
})

const updateAccountDetails = asynHandler(async(req,res)=>{
    const {fullName,email}= req.body

    if (!fullName || !email) {
        throw new ApiError(400,"All fields are required")
    }

    const user  = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"accounts details updated successfully"))
})

const updateUserAvatar =  asynHandler(async(req,res)=>{

    const avatarLocalPath =  req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }

     const avatar = await uploadOnCloudinary(avatarLocalPath)

     if (!avatar.url) {
        throw new ApiError(400,"Error while uploading avatar")
     }

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
     ).select("-password")

     return res
     .status(200)
     .json(
        new ApiError(200,user,"Avatar updated successfully") 
     )
})

const updateUserCoverImage =  asynHandler(async(req,res)=>{

    const coverImageLocalPath =  req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"Cover image file is missing")
    }

     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

     if (!coverImage.url) {
        throw new ApiError(400,"Error while uploading cover image")
     }

     await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
     ).select("-password")

     return res
     .status(200)
     .json(
        new ApiError(200,user,"Cover image updated successfully") 
     )
})

const getUserChannelProfile = asynHandler(async(req,res)=>{

    const{username}= req.params

    if (!username?.trim()) {
        throw new ApiError(400,"username is missing")
    }

   const channel =  await User.aggregate([
    {
        $match:{
            username:username?.toLowerCase();
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        } 
    },
    {
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            channelsSubscribedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
            fullName:1,
            username:1,
            email:1,
            avatar:1,
            coverImage:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1
        }
    }
])

  if (!channel?.length) {
    throw new ApiError(400,"Channel does not exist") 
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,channel[0],"Channel fetched successfully")
  )


})

export {registerUser
    ,loginUser
    ,logoutUser
    ,refreshAccessToken
    ,changeCurrentUserPassword
    ,getCurrentUser
    ,updateAccountDetails
    ,updateUserAvatar
    ,updateUserCoverImage
    ,getUserChannelProfile
}