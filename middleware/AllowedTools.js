const app_error=require('../utils/AppError');
const http_status_text=require('../utils/HttpStatusText')

module.exports = (...allowedroles)=>{
    return (req,res,next)=>{
        const cur_role=req.user.role;
        if(allowedroles.includes(cur_role)){
            return next();
        }
        const err=new app_error();
        err.create(
            `${cur_role} not allowed to make this action`,
            403,
            http_status_text.FAIL
        );
        return next(err);
    };
}
