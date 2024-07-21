import {asynHandler} from "../utils/asyncHandler.js"

const registerUser = asynHandler(async(req,res)=>{
    res.status(200).json({
        message:"chai aur code"
    })
})

export {registerUser}