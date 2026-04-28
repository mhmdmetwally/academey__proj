module.exports=(async_fn)=>{
    return (req,res,next)=>{
        async_fn(req,res,next).catch((err)=>{
            next(err);
        })
    }
}