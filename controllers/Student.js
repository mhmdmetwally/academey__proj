const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Student =
    require('../models/Student');

const StudentAssignment =
    require('../models/StudentAssignment');

const Family =
    require('../models/Family');

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
// Get Supervisor Assignment
// =====================================================

const getSupervisorAssignment =
    async (user_id) => {

        return await Supervisor.findOne({
            user: user_id,
            is_active: true
        });
    };


// =====================================================
// Create Student
// Academy Admin OR Supervisor
// =====================================================

const createStudent = AsyncWrapper(
    async (req, res, next) => {

        const {
            name,
            family_id
        } = req.body;


        if (
            !name ||
            !family_id
        ) {

            const error =
                new app_error();

            error.create(
                'name and family_id are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        let academy_id;
        let supervisor_id;


        // =================================================
        // Academy Admin
        // =================================================

        if (
            req.user.role ===
            user_role.academy_admin
        ) {

            academy_id =
                req.user.id;


            supervisor_id =
                req.body.supervisor_id;


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

        }


        // =================================================
        // Supervisor
        // =================================================

        else if (
            req.user.role ===
            user_role.supervisor
        ) {

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


            academy_id =
                supervisor.academy_id;

            supervisor_id =
                supervisor._id;

        }


        // =================================================
        // Invalid Role
        // =================================================

        else {

            const error =
                new app_error();

            error.create(
                'you are not allowed to create a student',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Check Academy
        // =================================================

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


        // =================================================
        // Check Supervisor
        // =================================================

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


        // =================================================
        // Check Family
        // =================================================

        const family =
            await Family.findOne({

                _id:
                    family_id,

                role:
                    user_role.family

            });

        if (!family) {

            const error =
                new app_error();

            error.create(
                'family not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Check Student
        // Same name + same family
        // =================================================

        let student =
            await Student.findOne({

                name:
                    name.trim(),

                family:
                    family._id

            });


        // =================================================
        // Create Student
        // =================================================

        if (!student) {

            student =
                new Student({

                    name:
                        name.trim(),

                    family:
                        family._id,

                    is_active:
                        true

                });

            await student.save();

        }


        // =================================================
        // Check Student in this Academy
        // =================================================

        const existing_assignment =
            await StudentAssignment.findOne({

                student:
                    student._id,

                academy_id

            });


        if (existing_assignment) {

            const error =
                new app_error();

            error.create(
                'this student already exists in this academy',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Create Assignment
        // =================================================

        const assignment =
            new StudentAssignment({

                student:
                    student._id,

                academy_id,

                family:
                    family._id,

                supervisor:
                    supervisor._id,

                is_active:
                    true

            });


        await assignment.save();


        // =================================================
        // Return
        // =================================================

        const result =
            await StudentAssignment
                .findById(
                    assignment._id
                )

                .populate(
                    'student',
                    'name family is_active'
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
                })

                .populate(
                    'family',
                    'name phone'
                );


        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {

                assignment:
                    result

            }

        });

    }
);


// =====================================================
// Academy Gets Students
// =====================================================

const getAcademyStudents = AsyncWrapper(
    async (req, res, next) => {

        const academy_id =
            req.user.id;


        const students =
            await StudentAssignment
                .find({
                    academy_id,
                    is_active: true
                })

                .populate(
                    'student',
                    'name family is_active'
                )

                .populate({
                    path: 'supervisor',
                    populate: {
                        path: 'user',
                        select: 'name phone'
                    }
                })

                .populate(
                    'family',
                    'name phone'
                );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            results:
                students.length,

            data: {

                students

            }

        });

    }
);


// =====================================================
// Academy Gets Single Student
// =====================================================

const getSingleStudent = AsyncWrapper(
    async (req, res, next) => {

        const academy_id =
            req.user.id;

        const assignment_id =
            req.params.student_id;


        const student =
            await StudentAssignment
                .findOne({

                    _id:
                        assignment_id,

                    academy_id

                })

                .populate(
                    'student',
                    'name family is_active'
                )

                .populate({
                    path: 'supervisor',
                    populate: {
                        path: 'user',
                        select: 'name phone'
                    }
                })

                .populate(
                    'family',
                    'name phone'
                );


        if (!student) {

            const error =
                new app_error();

            error.create(
                'student not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                student

            }

        });

    }
);


// =====================================================
// Supervisor Gets His Students
// =====================================================

const getMyStudents = AsyncWrapper(
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


        const students =
            await StudentAssignment
                .find({

                    academy_id:
                        supervisor.academy_id,

                    supervisor:
                        supervisor._id,

                    is_active:
                        true

                })

                .populate(
                    'student',
                    'name family is_active'
                )

                .populate(
                    'family',
                    'name phone'
                );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            results:
                students.length,

            data: {

                students

            }

        });

    }
);


// =====================================================
// Supervisor Gets Single Student
// =====================================================

const getSupervisorStudent = AsyncWrapper(
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


        const assignment =
            await StudentAssignment
                .findOne({

                    _id:
                        req.params.student_id,

                    academy_id:
                        supervisor.academy_id,

                    supervisor:
                        supervisor._id,

                    is_active:
                        true

                })

                .populate(
                    'student',
                    'name family is_active'
                )

                .populate(
                    'family',
                    'name phone'
                );


        if (!assignment) {

            const error =
                new app_error();

            error.create(
                'student not found or you are not allowed to access this student',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                student:
                    assignment

            }

        });

    }
);


// =====================================================
// Student Gets His Academies
// =====================================================

const getMyAcademies = AsyncWrapper(
    async (req, res, next) => {

        const student =
            await Student.findOne({

                _id:
                    req.user.id

            });


        if (!student) {

            const error =
                new app_error();

            error.create(
                'student profile not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const assignments =
            await StudentAssignment
                .find({

                    student:
                        student._id,

                    is_active:
                        true

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
                    assignments

            }

        });

    }
);


// =====================================================
// Update Student Assignment
// Academy Admin
// =====================================================

const updateStudentAssignment = AsyncWrapper(
    async (req, res, next) => {

        const academy_id =
            req.user.id;

        const assignment_id =
            req.params.student_id;

        const {
            supervisor_id,
            family_id,
            is_active
        } = req.body;


        const assignment =
            await StudentAssignment.findOne({

                _id:
                    assignment_id,

                academy_id

            });


        if (!assignment) {

            const error =
                new app_error();

            error.create(
                'student not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =============================================
        // Supervisor
        // =============================================

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


        // =============================================
        // Family
        // =============================================

        if (family_id) {

            const family =
                await User.findOne({

                    _id:
                        family_id,

                    role:
                        user_role.family

                });


            if (!family) {

                const error =
                    new app_error();

                error.create(
                    'family not found',
                    404,
                    http_status_text.FAIL
                );

                return next(error);
            }


            assignment.family =
                family._id;


            // Student belongs to Family
            // too, so update Student.family

            await Student.findByIdAndUpdate(
                assignment.student,
                {
                    family:
                        family._id
                }
            );
        }


        // =============================================
        // Active
        // =============================================

        if (
            is_active !== undefined
        ) {

            assignment.is_active =
                is_active;

        }


        await assignment.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                assignment

            }

        });

    }
);


module.exports = {

    createStudent,

    getAcademyStudents,

    getSingleStudent,

    getMyStudents,

    getSupervisorStudent,

    getMyAcademies,

    updateStudentAssignment

};