const AsyncWrapper = require('../middleware/AsyncWrapper');
const User = require('../models/User');
const Academy = require('../models/Academy');
const app_error = require('../utils/AppError');
const http_status_text = require('../utils/HttpStatusText');
const salt_round = Number(process.env.salt_round);
const user_role = require('../utils/UserRole');
const bcrypt = require('bcrypt');

const patchActiveSupervisor = AsyncWrapper(
    async(req,res,next)=>{
        const {phone,name,academy_id}=req.body;
        const user = await User.findOne({phone});
        if(!user){
            const error = app_error(
                `no user with this ${phone} and this ${name}`
                ,404,
                http_status_text.FAIL
            );
            return next(error);
        }
        if(user.academy_id!==academy_id)
        {
            const error = app_error(
                `you can't access this user with this ${phone} and this ${name}`
                ,404,
                http_status_text.FAIL
            );
            return next(error);

        }
        user = User.upateOne(
            {is_active : true},
            {new:true}
        );

        return res.status(200).json({
            status:http_status_text.SUCCESS
        });
        
    }
)

const patchStopSupervisor = AsyncWrapper(
    async(req,res,next)=>{
        const {phone,name,academy_id}=req.body;
        const user = await User.findOne({phone});
        if(!user){
            const error = app_error(
                `no user with this ${phone} and this ${name}`
                ,404,
                http_status_text.FAIL
            );
            return next(error);
        }
        if(user.academy_id!==academy_id)
        {
            const error = app_error(
                `you can't access this user with this ${phone} and this ${name}`
                ,404,
                http_status_text.FAIL
            );
            return next(error);

        }
        user=User.upateOne(
            {is_active : false},
            {new:true}
        );

        return res.status(200).json({
            status:http_status_text.SUCCESS
        });
        
    }
)

const register = AsyncWrapper
(
    async(req,res,next)=>{
        const new_academy = req.body;
        

        const cur_academy=await Academy.findOne({
            manager_phone: new_academy.phone,
            manager_name : new_academy.manager_name
        });
        if(cur_academy)
        {
            let message=`academy with this manager_phone: ${cur_academy.manager_phone} and manager_name: ${cur_academy.manager_name} already exist!`
            const error = new app_error()
            error.create(message,404,http_status_text.FAIL);
            return next(error); 
        }
        const hashed_password = await bcrypt.hash(new_academy, salt_round);

        const academy = new Academy({
            ...new_academy,
            password: hashed_password
        });

        await academy.save();

        const payload = {
            manager_name: academy.manager_name,
            manager_phone:academy.manager_phone,
            id: academy._id,
            role:user_role.academy_admin
        };

        const token = await gen_token(payload);

        academy.password = undefined;

        res.status(201).json({
            status: http_status_text.SUCCESS,
            data: { user, token }
        });
    }
)
const login = AsyncWrapper
(
    async(req,res,next)=>{
        const { manager_phone, password } = req.body;

        if (!manager_phone || !password) {
            return next(new app_error().create("manager_phone and password required", 400, http_status_text.FAIL));
        }

        const academy = await Academy.findOne({ manager_phone });

        if (!academy) {
            return next(new app_error().create("user or password are wrong", 404, http_status_text.FAIL));
        }

        const matched_password = await bcrypt.compare(password, academy.password);

        if (!matched_password) {
            return next(new app_error().create("user or password are wrong", 401, http_status_text.FAIL));
        }

        const token = await gen_token({
            manager_name: academy.manager_name,
            manager_phone:academy.manager_phone,
            id: academy._id,
            role:user_role.academy_admin
        });

        res.json({
            status: http_status_text.SUCCESS,
            data: { token }
        });
    }
)



module.exports = {
    patchActiveSupervisor,
    patchStopSupervisor,
    register,
    login
}
