const http_status_text =
    require('../utils/HttpStatusText');

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


module.exports = {

    register,

    login

};