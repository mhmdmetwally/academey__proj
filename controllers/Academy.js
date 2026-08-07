const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Academy =
    require('../models/Academy');

const Supervisor =
    require('../models/Supervisor');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const gen_token =
    require('../utils/gen_token');

const bcrypt =
    require('bcrypt');

const salt_round =
    Number(process.env.salt_round);


// =====================================================
// Register Academy
// =====================================================

const register = AsyncWrapper(

    async (req, res, next) => {

        const {
            academy_name,
            manager_phone,
            manager_name,
            academy_code,
            password
        } = req.body;


        if (
            !academy_name ||
            !manager_phone ||
            !manager_name ||
            !academy_code ||
            !password
        ) {

            const error =
                new app_error();

            error.create(
                'academy_name, manager_phone, manager_name, academy_code and password are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        const academy_by_code =
            await Academy.findOne({
                academy_code
            });


        if (academy_by_code) {

            const error =
                new app_error();

            error.create(
                'academy with this academy_code already exists',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        const academy_by_phone =
            await Academy.findOne({
                manager_phone
            });


        if (academy_by_phone) {

            const error =
                new app_error();

            error.create(
                'academy with this manager_phone already exists',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        const hashed_password =
            await bcrypt.hash(
                password,
                salt_round
            );


        const academy =
            new Academy({

                academy_name,

                manager_phone,

                manager_name,

                academy_code,

                password:
                    hashed_password,

                is_active:
                    false

            });


        await academy.save();


        const token =
            await gen_token({

                id:
                    academy._id,

                manager_name:
                    academy.manager_name,

                manager_phone:
                    academy.manager_phone,

                role:
                    'academy_admin'

            });


        academy.password =
            undefined;


        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {

                academy,

                token

            }

        });

    }

);


// =====================================================
// Academy Login
// =====================================================

const login = AsyncWrapper(

    async (req, res, next) => {

        const {
            manager_phone,
            password
        } = req.body;


        if (
            !manager_phone ||
            !password
        ) {

            const error =
                new app_error();

            error.create(
                'manager_phone and password required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        const academy =
            await Academy.findOne({
                manager_phone
            });


        if (!academy) {

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
                academy.password
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


        if (!academy.is_active) {

            const error =
                new app_error();

            error.create(
                'academy is not active',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        const token =
            await gen_token({

                id:
                    academy._id,

                manager_name:
                    academy.manager_name,

                manager_phone:
                    academy.manager_phone,

                role:
                    'academy_admin'

            });


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                token

            }

        });

    }

);


// =====================================================
// Get Academy Profile
// =====================================================

const getMyAcademy = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;


        const academy =
            await Academy.findById(
                academy_id
            ).select('-password -__v');


        if (!academy) {

            const error =
                new app_error();

            error.create(
                'academy not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                academy

            }

        });

    }

);


// =====================================================
// Update Academy
// =====================================================

const updateAcademy = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;


        const {
            academy_name,
            manager_name,
            manager_phone
        } = req.body;


        const academy =
            await Academy.findById(
                academy_id
            );


        if (!academy) {

            const error =
                new app_error();

            error.create(
                'academy not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            manager_phone &&
            manager_phone !==
                academy.manager_phone
        ) {

            const existing_academy =
                await Academy.findOne({

                    manager_phone,

                    _id: {
                        $ne:
                            academy_id
                    }

                });


            if (existing_academy) {

                const error =
                    new app_error();

                error.create(
                    'this manager phone already belongs to another academy',
                    409,
                    http_status_text.FAIL
                );

                return next(error);
            }


            academy.manager_phone =
                manager_phone;
        }


        if (academy_name) {

            academy.academy_name =
                academy_name;

        }


        if (manager_name) {

            academy.manager_name =
                manager_name;

        }


        await academy.save();


        const updated_academy =
            await Academy.findById(
                academy_id
            ).select('-password -__v');


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                academy:
                    updated_academy

            }

        });

    }

);


// =====================================================
// Change Academy Password
// =====================================================

const changePassword = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;


        const {
            old_password,
            new_password
        } = req.body;


        if (
            !old_password ||
            !new_password
        ) {

            const error =
                new app_error();

            error.create(
                'old_password and new_password are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        const academy =
            await Academy.findById(
                academy_id
            );


        if (!academy) {

            const error =
                new app_error();

            error.create(
                'academy not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const matched_password =
            await bcrypt.compare(
                old_password,
                academy.password
            );


        if (!matched_password) {

            const error =
                new app_error();

            error.create(
                'old password is wrong',
                401,
                http_status_text.FAIL
            );

            return next(error);
        }


        const hashed_password =
            await bcrypt.hash(
                new_password,
                salt_round
            );


        academy.password =
            hashed_password;


        await academy.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            message:
                'password changed successfully'

        });

    }

);


// =====================================================
// Activate Supervisor
// Academy Admin
// =====================================================

const patchActiveSupervisor = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;


        const {
            supervisor_id
        } = req.body;


        if (!supervisor_id) {

            const error =
                new app_error();

            error.create(
                'supervisor_id is required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        const supervisor =
            await Supervisor.findOne({

                _id:
                    supervisor_id,

                academy_id

            });


        if (!supervisor) {

            const error =
                new app_error();

            error.create(
                'supervisor not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        supervisor.is_active =
            true;


        await supervisor.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                supervisor

            }

        });

    }

);


// =====================================================
// Stop Supervisor
// Academy Admin
// =====================================================

const patchStopSupervisor = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;


        const {
            supervisor_id
        } = req.body;


        if (!supervisor_id) {

            const error =
                new app_error();

            error.create(
                'supervisor_id is required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        const supervisor =
            await Supervisor.findOne({

                _id:
                    supervisor_id,

                academy_id

            });


        if (!supervisor) {

            const error =
                new app_error();

            error.create(
                'supervisor not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        supervisor.is_active =
            false;


        await supervisor.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                supervisor

            }

        });

    }

);


module.exports = {

    register,

    login,

    getMyAcademy,

    updateAcademy,

    changePassword,

    patchActiveSupervisor,

    patchStopSupervisor

};