const asynHandler =(requestHandler)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next) ).catch((err)=>next(err))
    }
}

export {asynHandler}

/*
const asynHandler = (fn)=>async(res,req,next)=>{
    try {
        await fn(res,req,next)
    } catch (error) {
        res.status(err.code || 500).json({
            success:false,
            message:err.message
        })
    }
}
*/ 