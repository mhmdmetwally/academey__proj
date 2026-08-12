const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const moongose= require('mongoose');

const Teacher =
    require('../models/Teacher');

const TeacherAssignment =
    require('../models/TeacherAssignment');

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


// =====================================================
// Helper
// =====================================================

const getSupervisorAssignment =
    async (user_id) => {

        return await Supervisor.findOne({

            user:
                user_id,

            is_active:
                true

        });
    };


// =====================================================
// Create Teacher
// Academy Admin OR Supervisor
// =====================================================

const createTeacher = AsyncWrapper(
    async (req, res, next) => {

        const {
            name,
            phone,
            supervisor_id,
            price_per_lesson
        } = req.body;


        // =================================================
        // Input Validation
        // =================================================

        if (
            !name ||
            !phone ||
            price_per_lesson === undefined
        ) {
            const error = new app_error();
            error.create(
                'name, phone and price_per_lesson are required',
                400,
                http_status_text.FAIL
            );
            return next(error);
        }

        if (price_per_lesson < 0) {
            const error = new app_error();
            error.create(
                'price_per_lesson cannot be negative',
                400,
                http_status_text.FAIL
            );
            return next(error);
        }


        let academy_id;
        let final_supervisor_id;


        // =================================================
        // Role 1: Academy Admin
        // =================================================

        if (req.user.role === user_role.academy_admin) {

            academy_id = req.user.id;

            if (!supervisor_id) {
                const error = new app_error();
                error.create(
                    'supervisor_id is required',
                    400,
                    http_status_text.FAIL
                );
                return next(error);
            }

            // 🔒 فحص المشرف: التبعية للأكاديمية + حالة النشاط في استعلام واحد
            const supervisorExists = await Supervisor.findOne({
                _id: supervisor_id,
                academy_id,
                is_active: true
            });
            
            if (!supervisorExists) {
                const error = new app_error();
                error.create(
                    `${academy_id} ${supervisor_id}  supervisor does not exist, is inactive, or does not belong to this academy`,
                    400,
                    http_status_text.FAIL
                );
                return next(error);
            }

            final_supervisor_id = supervisor_id;
        }


        // =================================================
        // Role 2: Supervisor
        // =================================================

        else if (req.user.role === user_role.supervisor) {

            const supervisor = await getSupervisorAssignment(req.user.id);

            if (!supervisor) {
                const error = new app_error();
                error.create(
                    'supervisor assignment not found',
                    404,
                    http_status_text.FAIL
                );
                return next(error);
            }

            academy_id = supervisor.academy_id;
            final_supervisor_id = supervisor._id;
        }


        // =================================================
        // Invalid Role
        // =================================================

        else {
            const error = new app_error();
            error.create(
                'you are not allowed to create a teacher',
                403,
                http_status_text.FAIL
            );
            return next(error);
        }


        // =================================================
        // Check Academy
        // =================================================

        const academy = await Academy.findById(academy_id);

        if (!academy) {
            const error = new app_error();
            error.create(
                'academy not found',
                404,
                http_status_text.FAIL
            );
            return next(error);
        }


        // =================================================
        // Find or Create Teacher (By Phone)
        // =================================================
        
        let teacher =

            await Teacher.findOne({



                name:

                    name.trim(),



                phone:

                    phone.trim()



            });

        if (!teacher) {
            teacher = new Teacher({
                name: name.trim(),
                phone: phone.trim(),
                is_active: true
            });

            await teacher.save();
        }


        // =================================================
        // Check Teacher Assignment in Academy
        // =================================================

        const existing_assignment = await TeacherAssignment.findOne({
            teacher: teacher._id,
            academy_id
        });

        if (existing_assignment) {
            const error = new app_error();
            error.create(
                'this teacher already exists in this academy',
                409,
                http_status_text.FAIL
            );
            return next(error);
        }


        // =================================================
        // Create Assignment
        // =================================================

        const assignment = new TeacherAssignment({
            teacher: teacher._id,
            academy_id,
            supervisor: final_supervisor_id,
            price_per_lesson,
            is_active: true
        });

        await assignment.save();


        // =================================================
        // Response
        // =================================================

        const result = await TeacherAssignment.findById(assignment._id)
            .populate('teacher', 'name phone is_active')
            .populate('academy_id', 'academy_name academy_code')
            .populate({
                path: 'supervisor',
                populate: {
                    path: 'user',
                    select: 'name phone'
                }
            });

        return res.status(201).json({
            status: http_status_text.SUCCESS,
            data: {
                assignment: result
            }
        });

    }
);


// =====================================================
// Supervisor Gets His Teachers
// =====================================================

const getMyTeachers = AsyncWrapper(
    async (req, res, next) => {

        const supervisor =
            await getSupervisorAssignment(
                req.user.id
            );


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
            await TeacherAssignment
                .find({

                    academy_id:
                        supervisor.academy_id,

                    supervisor:
                        supervisor._id,

                    is_active:
                        true

                })

                .populate(
                    'teacher',
                    'name phone is_active'
                );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            results:
                teachers.length,

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

        const supervisor =
            await getSupervisorAssignment(
                req.user.id
            );


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
            await TeacherAssignment
                .findOne({

                    _id:
                        req.params.teacher_id,

                    academy_id:
                        supervisor.academy_id,

                    supervisor:
                        supervisor._id,

                    is_active:
                        true

                })

                .populate(
                    'teacher',
                    'name phone is_active'
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
// Academy Admin Gets Teachers
// =====================================================

const getAcademyTeachers = AsyncWrapper(
    async (req, res, next) => {

        const academy_id =
            req.user.id;


        const teachers =
            await TeacherAssignment
                .find({

                    academy_id,

                    is_active:
                        true

                })

                .populate(
                    'teacher',
                    'name phone is_active'
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

            results:
                teachers.length,

            data: {

                teachers

            }

        });

    }
);


// =====================================================
// Academy Admin Gets Single Teacher
// =====================================================

const getAcademySingleTeacher =
    AsyncWrapper(
        async (req, res, next) => {

            const academy_id =
                req.user.id;


            const teacher =
                await TeacherAssignment
                    .findOne({

                        _id:
                            req.params.teacher_id,

                        academy_id

                    })

                    .populate(
                        'teacher',
                        'name phone is_active'
                    )

                    .populate({
                        path: 'supervisor',
                        populate: {
                            path: 'user',
                            select: 'name phone'
                        }
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
// Update Teacher Assignment
// Academy Admin
// =====================================================

const updateTeacher =
    AsyncWrapper(
        async (req, res, next) => {

            const academy_id =
                req.user.id;

            const assignment_id =
                req.params.teacher_id;


            const {
                supervisor_id,
                price_per_lesson,
                is_active
            } = req.body;


            const assignment =
                await TeacherAssignment.findOne({

                    _id:
                        assignment_id,

                    academy_id

                });


            if (!assignment) {

                const error =
                    new app_error();

                error.create(
                    'teacher not found in this academy',
                    404,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Supervisor
            // =========================================

            if (supervisor_id) {

                const supervisor =
                    await Supervisor.findOne({

                        _id:
                            supervisor_id,

                        academy_id,

                        is_active:
                            true

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


                assignment.supervisor =
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


                assignment.price_per_lesson =
                    price_per_lesson;

            }


            // =========================================
            // Active
            // =========================================

            if (
                is_active !==
                undefined
            ) {

                assignment.is_active =
                    is_active;

            }


            await assignment.save();


            const updated_teacher =
                await TeacherAssignment
                    .findById(
                        assignment._id
                    )

                    .populate(
                        'teacher',
                        'name phone is_active'
                    )

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

                    assignment:
                        updated_teacher

                }

            });

        }
    );





module.exports = {

    createTeacher,

    getMyTeachers,

    getSingleTeacher,

    getAcademyTeachers,

    getAcademySingleTeacher,

    updateTeacher,

};