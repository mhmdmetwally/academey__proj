const bcrypt = require('bcrypt');

const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const User =
    require('../models/User');

const Student =
    require('../models/Student');

const StudentAssignment =
    require('../models/StudentAssignment');

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
// Create Student
// Academy Admin
// =====================================================

const createStudent = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;

        const {
            name,
            phone,
            password,
            family_id,
            supervisor_id
        } = req.body;


        if (
            !name ||
            !phone ||
            !password ||
            !family_id ||
            !supervisor_id
        ) {

            const error =
                new app_error();

            error.create(
                'name, phone, password, family_id and supervisor_id are required',
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
        // Check Family
        // =========================================

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


        // =========================================
        // Find Student User
        // =========================================

        let user =
            await User.findOne({
                phone
            });


        if (user) {

            if (
                user.role !==
                user_role.student
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
        // Create User if doesn't exist
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
                        user_role.student,

                    is_active: true

                });

            await user.save();
        }


        // =========================================
        // Find / Create Student
        // =========================================

        let student =
            await Student.findOne({

                user:
                    user._id

            });


        if (!student) {

            student =
                new Student({

                    user:
                        user._id,

                    is_active: true

                });

            await student.save();
        }


        // =========================================
        // Check if already in Academy
        // =========================================

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


        // =========================================
        // Create Assignment
        // =========================================

        const assignment =
            new StudentAssignment({

                student:
                    student._id,

                academy_id,

                supervisor:
                    supervisor._id,

                family:
                    family._id,

                is_active: true

            });

        await assignment.save();


        // =========================================
        // Populate Result
        // =========================================

        const result =
            await StudentAssignment
                .findById(
                    assignment._id
                )

                .populate(
                    'student'
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
// Academy Admin Gets Students
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
                    'student'
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

            data: {

                students

            }

        });

    }
);


// =====================================================
// Get Single Student in Academy
// Academy Admin
// =====================================================

const getSingleStudent = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;

        const student_id =
            req.params.student_id;


        const student =
            await StudentAssignment
                .findOne({

                    _id:
                        student_id,

                    academy_id

                })

                .populate(
                    'student'
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
// Student Gets His Academies
// =====================================================

const getMyAcademies = AsyncWrapper(

    async (req, res, next) => {

        const user_id =
            req.user.id;


        const student =
            await Student.findOne({

                user:
                    user_id

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

                    is_active: true

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
                })

                .populate(
                    'family',
                    'name phone'
                );


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

const updateStudentAssignment =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                req.user.id;

            const student_id =
                req.params.student_id;

            const {
                supervisor_id,
                family_id,
                is_active
            } = req.body;


            const assignment =
                await StudentAssignment.findOne({

                    _id:
                        student_id,

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


            // =====================================
            // Supervisor
            // =====================================

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


                assignment.supervisor =
                    supervisor._id;
            }


            // =====================================
            // Family
            // =====================================

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
            }


            // =====================================
            // Active
            // =====================================

            if (
                is_active !==
                undefined
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

    getMyAcademies,

    updateStudentAssignment

};