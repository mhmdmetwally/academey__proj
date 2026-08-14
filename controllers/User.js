const http_status_text =
    require('../utils/HttpStatusText');


const user_role =
    require('../utils/UserRole');

const jwt =
    require('jsonwebtoken');

const crypto =
    require('crypto');

const BlacklistedToken =
    require('../models/BlacklistedToken');

const gen_token =
    require('../utils/gen_token');

const bcrypt =
    require('bcrypt');

const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Users =
    require('../models/User');

const app_error =
    require('../utils/AppError');

const salt_round =
    Number(process.env.salt_round);


/*
=====================================================
Register
=====================================================
*/

const register = AsyncWrapper(

    async (req, res, next) => {

        const new_user =
            req.body;


        if (
            new_user.role ===
            'super_admin'
        ) {

            const error =
                new app_error();

            error.create(
                'you are not available to create a user with super_admin role',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        const cur_user =
            await Users.findOne({

                phone:
                    new_user.phone

            });


        if (cur_user) {

            const error =
                new app_error();

            error.create(
                `${cur_user.phone} already exist!`,
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        const hashed_password =
            await bcrypt.hash(

                new_user.password,

                salt_round

            );


        const user =
            new Users({

                ...new_user,

                password:
                    hashed_password

            });


        if(user.role!==user_role.academy_admin){
            user.is_active=true;
        }
        
        await user.save();
        

        const token =
            await gen_token({

                phone:
                    user.phone,

                id:
                    user._id,

                role:
                    user.role,

                academy_id:
                    user.academy_id

            });


        user.password =
            undefined;


        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {
                user,
                token
            }

        });

    }
);


/*
=====================================================
Login
=====================================================
*/

const login = AsyncWrapper(

    async (req, res, next) => {

        const {
            phone,
            password
        } = req.body;


        if (
            !phone ||
            !password
        ) {

            const error =
                new app_error();

            error.create(
                'phone and password required',
                400,
                http_status_text.FAIL
            );

            return next(error);

        }


        const user =
            await Users.findOne({

                phone

            });


        if (!user) {

            const error =
                new app_error();

            error.create(
                'user or password are wrong',
                401,
                http_status_text.FAIL
            );

            return next(error);

        }


        const matched_password =
            await bcrypt.compare(

                password,

                user.password

            );


        if (!matched_password) {

            const error =
                new app_error();

            error.create(
                'user or password are wrong',
                401,
                http_status_text.FAIL
            );

            return next(error);

        }


        const token =
            await gen_token({

                phone:
                    user.phone,

                id:
                    user._id,

                role:
                    user.role,

                academy_id:
                    user.academy_id

            });


        return res.json({

            status:
                http_status_text.SUCCESS,

            data: {
                token
            }

        });

    }
);


/*
=====================================================
Logout
=====================================================
*/

const logout = AsyncWrapper(

    async (req, res, next) => {

        const auth_header =
            req.headers['authorization'];


        // =================================================
        // Token Required
        // =================================================

        if (!auth_header) {

            const error =
                new app_error();

            error.create(
                'required token',
                401,
                http_status_text.ERROR
            );

            return next(error);
        }


        // =================================================
        // Bearer Token Format
        // =================================================

        const parts =
            auth_header.split(' ');


        if (
            parts.length !== 2 ||
            parts[0] !== 'Bearer' ||
            !parts[1]
        ) {

            const error =
                new app_error();

            error.create(
                'invalid authorization header',
                401,
                http_status_text.ERROR
            );

            return next(error);
        }


        const token =
            parts[1];


        // =================================================
        // Verify Token
        // =================================================

        let decoded;

        try {

            decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

        } catch (error) {

            const auth_error =
                new app_error();

            auth_error.create(
                'invalid token',
                401,
                http_status_text.ERROR
            );

            return next(auth_error);
        }


        // =================================================
        // Hash Token
        // =================================================

        const token_hash =
            crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');


        // =================================================
        // Token Expiration
        // =================================================

        const expires_at =
            new Date(
                decoded.exp * 1000
            );


        // =================================================
        // Add Token To Blacklist
        // =================================================

        await BlacklistedToken.findOneAndUpdate(

            {
                token_hash
            },

            {
                token_hash,

                expires_at

            },

            {
                upsert:
                    true,

                new:
                    true,

                setDefaultsOnInsert:
                    true
            }

        );


        // =================================================
        // Response
        // =================================================

        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            message:
                'logout successfully'

        });

    }

);

module.exports = {


    register,

    login,
    
    logout

};