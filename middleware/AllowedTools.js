
const jwt =
    require('jsonwebtoken');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const user_role =
    require('../utils/UserRole');

const Academy =
    require('../models/Academy');

const Supervisor =
    require('../models/Supervisor');

const User =
    require('../models/User');


// =====================================================
// Verify Token
// =====================================================

const verify_token =
    async (req, res, next) => {

        try {

            // =========================================
            // Get Token
            // =========================================

            const authHeader =
                req.headers.authorization;


            if (
                !authHeader ||
                !authHeader.startsWith('Bearer ')
            ) {

                const error =
                    new app_error();

                error.create(
                    'token is required',
                    401,
                    http_status_text.FAIL
                );

                return next(error);

            }


            const token =
                authHeader.split(' ')[1];


            // =========================================
            // Verify JWT
            // =========================================

            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );


            // =========================================
            // Check Role
            // =========================================

            if (!decoded.role) {

                const error =
                    new app_error();

                error.create(
                    'invalid token',
                    401,
                    http_status_text.FAIL
                );

                return next(error);

            }


            // =========================================
            // Academy Admin
            // =========================================

            if (
                decoded.role ===
                user_role.academy_admin
            ) {

                const academy =
                    await Academy.findById(
                        decoded.id
                    );


                if (!academy) {

                    const error =
                        new app_error();

                    error.create(
                        'academy not found',
                        401,
                        http_status_text.FAIL
                    );

                    return next(error);

                }


                /*
                IMPORTANT:

                is_active comes from MongoDB,
                NOT from JWT.
                */

                if (
                    academy.is_active !== true
                ) {

                    const error =
                        new app_error();

                    error.create(
                        'academy is not active',
                        403,
                        http_status_text.FAIL
                    );

                    return next(error);

                }


                req.user = {

                    id:
                        academy._id,

                    role:
                        decoded.role

                };


                return next();

            }


            // =========================================
            // Supervisor
            // =========================================

            if (
                decoded.role ===
                user_role.supervisor
            ) {

                const supervisor =
                    await Supervisor.findOne({

                        user:
                            decoded.id,

                        is_active:
                            true

                    });


                if (!supervisor) {

                    const error =
                        new app_error();

                    error.create(
                        'supervisor not found or not active',
                        403,
                        http_status_text.FAIL
                    );

                    return next(error);

                }


                req.user = {

                    id:
                        decoded.id,

                    role:
                        decoded.role,

                    academy_id:
                        supervisor.academy_id

                };


                return next();

            }


            // =========================================
            // Super Admin
            // =========================================

            if (
                decoded.role ===
                user_role.super_admin
            ) {

                const user =
                    await User.findById(
                        decoded.id
                    );


                if (!user) {

                    const error =
                        new app_error();

                    error.create(
                        'user not found',
                        401,
                        http_status_text.FAIL
                    );

                    return next(error);

                }


                req.user = {

                    id:
                        user._id,

                    role:
                        decoded.role

                };


                return next();

            }


            // =========================================
            // Unknown Role
            // =========================================

            const error =
                new app_error();

            error.create(
                'invalid user role',
                403,
                http_status_text.FAIL
            );

            return next(error);

        }

        catch (error) {

            /*
            JWT errors
            */

            if (
                error.name ===
                'JsonWebTokenError'
            ) {

                const err =
                    new app_error();

                err.create(
                    'invalid token',
                    401,
                    http_status_text.FAIL
                );

                return next(err);

            }


            if (
                error.name ===
                'TokenExpiredError'
            ) {

                const err =
                    new app_error();

                err.create(
                    'token expired',
                    401,
                    http_status_text.FAIL
                );

                return next(err);

            }


            return next(error);

        }

    };


module.exports =
    verify_token;

