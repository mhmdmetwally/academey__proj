const app_error=require('../utils/AppError');
const http_status_text=require('../utils/HttpStatusText')

module.exports = (...allowedroles)=>{
    return (req,res,next)=>{
        const cur_role=req.user.role;
        const is_active = req.user.is_active;
        
        if(!is_active)
        {
             const error =
                new app_error();

            error.create(
                
                `${cur_role} is not active`+ req.user,
                403,
                http_status_text.FAIL
            );

            return next(error);
        }

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
