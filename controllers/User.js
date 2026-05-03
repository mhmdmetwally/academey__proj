
const http_status_text=require('../utils/HttpStatusText');
const gen_token = require('../utils/gen_token');
const bcrypt = require('bcrypt');
const AsyncWrapper = require('../middleware/AsyncWrapper');
const Users = require('../models/User');
const app_error = require('../utils/AppError');
const salt_round = Number(process.env.salt_round)
const register = AsyncWrapper
(
    async(req,res,next)=>{
        const new_user = req.body;
        if(new_user.role==='super_admin')
        {
            let message=`you are not available to create a user with ${new_user.role} role !`
            const error = new app_error()
            error.create(message,404,http_status_text.FAIL);
            return next(error); 
        }

        const cur_user=await Users.findOne({phone: new_user.phone});
        if(cur_user)
        {
            let message=` ${cur_user.phone} already exist!`
            const error = new app_error()
            error.create(message,404,http_status_text.FAIL);
            return next(error); 
        }
        const hashed_password = await bcrypt.hash(new_user.password, salt_round);

        const user = new Users({
            ...new_user,
            password: hashed_password
        });

        await user.save();

        const payload = {
            phone: user.phone,
            id: user._id,
            role: user.role,
        };

        const token = await gen_token(payload);

        user.password = undefined;

        res.status(201).json({
            status: http_status_text.SUCCESS,
            data: { user, token }
        });
    }
)
const login = AsyncWrapper
(
    async(req,res,next)=>{
        const { phone, password } = req.body;

        if (!phone || !password) {
            return next(new app_error().create("phone and password required", 400, http_status_text.FAIL));
        }

        const user = await Users.findOne({ phone });

        if (!user) {
            return next(new app_error().create("user or password are wrong", 404, http_status_text.FAIL));
        }

        const matched_password = await bcrypt.compare(password, user.password);

        if (!matched_password) {
            return next(new app_error().create("user or password are wrong", 401, http_status_text.FAIL));
        }

        const token = await gen_token({
            phone: user.phone,
            id: user._id,
            role: user.role
        });

        res.json({
            status: http_status_text.SUCCESS,
            data: { token }
        });
    }
)

module.exports = {
    register,
    login
}