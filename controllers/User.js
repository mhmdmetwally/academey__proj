
const http_status_text=require('../utils/HttpStatusText');
const gen_token = require('../utils/gen_token');
const bcrypt = require('bcrypt');
const AsyncWrapper = require('../middleware/AsyncWrapper');
const Users = require('../models/User');
const app_error = require('../utils/AppError');
const salt_round = Number (proccess.env.salt_round)
const register = AsyncWrapper
(
    async(req,res,next)=>{
        const new_user = req.body;
         
        const cur_user=await Users.findOne({phone: new_user.phone});
        if(cur_user)
        {
            let message=` ${cur_user.phone} already exist!`
            const error = new app_error()
            error.create(message,404,http_status_text.FAIL);
            return next(error); 
        }
        const hashed_password = await bcrypt.hash(password,salt_round);
        cur_user.password=hashed_password;
        const user = new Users({
           cur_user
        });
        
        //gen token
        const payload={
            phone:user.phone,
            id:user._id,
            role:user.role,
        };
        const token = await gen_token(payload);
        user.token=token;
        await user.save();
        res.status(201).json({
            status : http_status_text.SUCCESS,
            data : { user : user }}
        );
    }
)
const login = AsyncWrapper
(
    async(req,res,next)=>{
        const {phone,password}=req.body;
        if(!phone || !password)
        {
            let message=`NO user with those phone and password are required`
            const error = new app_error()
            error.create(message,404,http_status_text.FAIL);
            return next(error); 
        }

        const user = await Users.findOne({phone:phone});
        const matched_password = await bcrypt.compare(password,user.password);
        if(user && matched_password)
        {
            const payload={
                phone:user.phone,
                name:user.name,
                id:user._id,
                role:user.role
            };
            user.token = await gen_token(payload);
            return res.json({
                status:http_status_text.SUCCESS,
                data:{
                    token:user.token,
                }
            })
        }
        else{
            let message=`email or password are wrong`
            const error = new app_error()
            error.create(message,500,http_status_text.ERORR);
            return next(error); 
        }

})
module.exports = {
    register,
    login
}