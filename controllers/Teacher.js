const bcrypt = require('bcrypt');

const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const User =
    require('../models/User');

const Teacher =
    require('../models/Teacher');

const Supervisor =
    require('../models/Supervisor');

const Academy =
    require('../models/Academy');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const user_role =
    require('../utils/UserRole');

const salt_round =
    Number(process.env.salt_round);


// =====================================================
// Create Teacher Assignment
// Academy Admin
// =====================================================

const createTeacher = AsyncWrapper(

    async (req, res, next) => {

        const {
            name,
            phone,
            password,
            supervisor_id,
            price_per_lesson
        } = req.body;


        // Academy Admin id = Academy id
        const academy_id =
            req.user.id;


        if (
            !name ||
            !phone ||
            !password ||
            !supervisor_id ||
            price_per_lesson === undefined
        ) {

            const error =
                new app_error();

            error.create(
                'name, phone, password, supervisor_id and price_per_lesson are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            price_per_lesson < 0
        ) {

            const error =
                new app_error();

            error.create(
                'price_per_lesson cannot be negative',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Academy
        // =========================================

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


        // =========================================
        // Check Supervisor
        // =========================================
        // supervisor_id here is Supervisor assignment id
        // NOT User id.
        // =========================================

        const supervisor =
            await Supervisor.findOne({

                _id:
                    supervisor_id,

                academy_id,

                is_active: true

            });


        if (!supervisor) {

            const error =
                new app_error();

            error.create(
                'supervisor does not belong to this academy',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Find User by phone
        // =========================================

        let user =
            await User.findOne({
                phone
            });


        // =========================================
        // Existing User
        // =========================================

        if (user) {

            if (
                user.role !==
                user_role.teacher
            ) {

                const error =
                    new app_error();

                error.create(
                    'this phone already belongs to another user role',
                    409,
                    http_status_text.FAIL
                );

                return next(error);
            }

        }


        // =========================================
        // Create User
        // =========================================

        if (!user) {

            const hashed_password =
                await bcrypt.hash(
                    password,
                    salt_round
                );


            user =
                new User({

                    name,

                    phone,

                    password:
                        hashed_password,

                    role:
                        user_role.teacher,

                    is_active: true

                });


            await user.save();

        }


        // =========================================
        // Check existing Teacher assignment
        // =========================================

        const existing_teacher =
            await Teacher.findOne({

                user:
                    user._id,

                academy_id

            });


        if (existing_teacher) {

            const error =
                new app_error();

            error.create(
                'this teacher already exists in this academy',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Create Teacher
        // =========================================

        const teacher =
            new Teacher({

                user:
                    user._id,

                academy_id,

                supervisor:
                    supervisor._id,

                price_per_lesson,

                is_active: true

            });


        await teacher.save();


        // =========================================
        // Return
        // =========================================

        const teacher_data =
            await Teacher.findById(
                teacher._id
            )

            .populate(
                'user',
                'name phone role'
            )

            .populate({
                path: 'supervisor',
                populate: {
                    path: 'user',
                    select: 'name phone'
                }
            })

            .populate(
                'academy_id',
                'academy_name academy_code'
            );


        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {

                teacher:
                    teacher_data

            }

        });

    }
);


// =====================================================
// Supervisor Gets His Teachers
// =====================================================

const getMyTeachers = AsyncWrapper(

    async (req, res, next) => {

        // req.user.id = User id
        const user_id =
            req.user.id;


        // Find Supervisor assignment
        const supervisor =
            await Supervisor.findOne({

                user:
                    user_id,

                is_active: true

            });


        if (!supervisor) {

            const error =
                new app_error();

            error.create(
                'supervisor assignment not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const teachers =
            await Teacher.find({

                academy_id:
                    supervisor.academy_id,

                supervisor:
                    supervisor._id

            })

            .populate(
                'user',
                'name phone is_active'
            )

            .populate(
                'academy_id',
                'academy_name academy_code'
            );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                teachers

            }

        });

    }

);


// =====================================================
// Supervisor Gets Single Teacher
// =====================================================

const getSingleTeacher = AsyncWrapper(

    async (req, res, next) => {

        const teacher_id =
            req.params.teacher_id;


        const supervisor =
            await Supervisor.findOne({

                user:
                    req.user.id,

                is_active: true

            });


        if (!supervisor) {

            const error =
                new app_error();

            error.create(
                'supervisor assignment not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const teacher =
            await Teacher.findOne({

                _id:
                    teacher_id,

                academy_id:
                    supervisor.academy_id,

                supervisor:
                    supervisor._id

            })

            .populate(
                'user',
                'name phone is_active'
            )

            .populate(
                'academy_id',
                'academy_name academy_code'
            );


        if (!teacher) {

            const error =
                new app_error();

            error.create(
                'teacher not found or you are not allowed to access this teacher',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                teacher

            }

        });

    }

);


// =====================================================
// Update Teacher
// Academy Admin
// =====================================================

const updateTeacher = AsyncWrapper(

    async (req, res, next) => {

        const teacher_id =
            req.params.teacher_id;

        const academy_id =
            req.user.id;


        const teacher =
            await Teacher.findOne({

                _id:
                    teacher_id,

                academy_id

            });


        if (!teacher) {

            const error =
                new app_error();

            error.create(
                'teacher not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const {
            supervisor_id,
            price_per_lesson,
            is_active
        } = req.body;


        // =========================================
        // Supervisor
        // =========================================

        if (supervisor_id) {

            const supervisor =
                await Supervisor.findOne({

                    _id:
                        supervisor_id,

                    academy_id,

                    is_active: true

                });


            if (!supervisor) {

                const error =
                    new app_error();

                error.create(
                    'supervisor does not belong to this academy',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            teacher.supervisor =
                supervisor._id;

        }


        // =========================================
        // Price
        // =========================================

        if (
            price_per_lesson !==
            undefined
        ) {

            if (
                price_per_lesson < 0
            ) {

                const error =
                    new app_error();

                error.create(
                    'price_per_lesson cannot be negative',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            teacher.price_per_lesson =
                price_per_lesson;

        }


        // =========================================
        // Active
        // =========================================

        if (
            is_active !==
            undefined
        ) {

            teacher.is_active =
                is_active;

        }


        await teacher.save();


        const updated_teacher =
            await Teacher.findById(
                teacher._id
            )

            .populate(
                'user',
                'name phone is_active'
            )

            .populate({
                path: 'supervisor',
                populate: {
                    path: 'user',
                    select: 'name phone'
                }
            })

            .populate(
                'academy_id',
                'academy_name academy_code'
            );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                teacher:
                    updated_teacher

            }

        });

    }

);


// =====================================================
// Teacher Gets His Academies
// =====================================================

const getTeacherAcademies = AsyncWrapper(

    async (req, res, next) => {

        const user_id =
            req.user.id;


        const teachers =
            await Teacher.find({

                user:
                    user_id

            })

            .populate(
                'academy_id',
                'academy_name academy_code'
            )

            .populate({
                path: 'supervisor',
                populate: {
                    path: 'user',
                    select: 'name phone'
                }
            });


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                academies:
                    teachers

            }

        });

    }

);


module.exports = {

    createTeacher,

    getMyTeachers,

    getSingleTeacher,

    updateTeacher,

    getTeacherAcademies

};