const jwt = require('jsonwebtoken');
const app_error = require('../utils/AppError');
const JWT_SECRET = proccess.env.JWT_SECRET;
const http_status_text = require('../utils/HttpStatusText');

const verify_token = (req,res,next)=>{
    const auth_header = req.headers["Authorization"] || req.headers["authorization"];

    if(!auth_header)
    {
        const error=new app_error;
        const message = 'required token';
        err.create(message,
            401,
            http_status_text.ERROR
        );
        return next(error);
    }
    
    const token = auth_header.split(' ')[1];

    try{
        const decode_token=jwt.verify(token,JWT_SECRET);
        req.user=decode_token.payload;
        next();
    }catch(error){
        const error = new app_error;
        const message = 'invalid token';
        error.create(message,
            401,
            http_status_text.ERROR
        )
        next(error);
    }
}

module.exports = verify_token;