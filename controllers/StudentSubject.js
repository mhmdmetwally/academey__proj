const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const StudentSubject =
    require('../models/StudentSubject');

const StudentAssignment =
    require('../models/StudentAssignment');

const Subject =
    require('../models/Subject');

const TeacherAssignment =
    require('../models/TeacherAssignment');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const {
    getAcademyId,
    getStudentAssignmentForUser,
    getTeacherAssignmentForUser
} = require('../utils/AccessScope');


// =====================================================
// Add Subject To Student
// =====================================================

const addSubjectToStudent = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);

        const student_assignment_id =
            req.params.student_assignment_id;

        const {
            subject_id,
            teacher_assignment_id,
            price_per_lesson
        } = req.body;


        // =========================================
        // Validate required fields
        // =========================================

        if (
            !subject_id ||
            !teacher_assignment_id ||
            price_per_lesson === undefined
        ) {

            const error =
                new app_error();

            error.create(
                'subject_id, teacher_assignment_id and price_per_lesson are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Student Access
        // =========================================

        const studentAssignment =
            await getStudentAssignmentForUser(
                req,
                student_assignment_id
            );


        if (!studentAssignment) {

            const error =
                new app_error();

            error.create(
                'you cannot access this student',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Subject
        // =========================================

        const subject =
            await Subject.findOne({

                _id:
                    subject_id,

                academy:
                    academy_id,

                is_active: true

            });


        if (!subject) {

            const error =
                new app_error();

            error.create(
                'subject not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Teacher Access
        // =========================================

        const teacherAssignment =
            await getTeacherAssignmentForUser(
                req,
                teacher_assignment_id
            );


        if (!teacherAssignment) {

            const error =
                new app_error();

            error.create(
                'you cannot access this teacher',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Teacher belongs to Subject
        // =========================================

        const teacherExists =
            subject.teachers.some(

                teacher_id =>
                    String(teacher_id) ===
                    String(teacherAssignment.teacher)

            );


        if (!teacherExists) {

            const error =
                new app_error();

            error.create(
                'this teacher is not assigned to this subject',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Validate Price
        // =========================================

        const price =
            Number(price_per_lesson);


        if (
            Number.isNaN(price) ||
            price < 0
        ) {

            const error =
                new app_error();

            error.create(
                'price_per_lesson must be a valid non-negative number',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Duplicate
        // =========================================

        const existing =
            await StudentSubject.findOne({

                student_assignment:
                    student_assignment_id,

                subject:
                    subject_id

            });


        if (existing) {

            const error =
                new app_error();

            error.create(
                'student already has this subject',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Create Student Subject
        // =========================================

        try {

            const studentSubject =
                await StudentSubject.create({

                    student_assignment:
                        studentAssignment._id,

                    subject:
                        subject._id,

                    teacher:
                        teacherAssignment._id,

                    price_per_lesson:
                        price,

                    is_active:
                        true

                });


            return res.status(201).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    studentSubject
                }

            });

        } catch (error) {

            if (
                error.code === 11000
            ) {

                const duplicateError =
                    new app_error();

                duplicateError.create(
                    'student already has this subject',
                    409,
                    http_status_text.FAIL
                );

                return next(
                    duplicateError
                );
            }

            return next(error);
        }

    }
);


// =====================================================
// Get Student Subjects
// =====================================================

const getStudentSubjects = AsyncWrapper(

    async (req, res, next) => {

        const student_assignment_id =
            req.params.student_assignment_id;


        // =========================================
        // Check Student Access
        // =========================================

        const studentAssignment =
            await getStudentAssignmentForUser(
                req,
                student_assignment_id
            );


        if (!studentAssignment) {

            const error =
                new app_error();

            error.create(
                'you cannot access this student',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Get Subjects
        // =========================================

        const subjects =
            await StudentSubject.find({

                student_assignment:
                    studentAssignment._id,

                is_active:
                    true

            })

            .populate(
                'subject'
            )

            .populate(
                'teacher'
            )

            .sort({
                createdAt: -1
            });


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {
                subjects
            }

        });

    }
);


// =====================================================
// Change Teacher
// =====================================================

const changeStudentTeacher = AsyncWrapper(

    async (req, res, next) => {

        const student_subject_id =
            req.params.student_subject_id;

        const {
            teacher_assignment_id
        } = req.body;


        if (!teacher_assignment_id) {

            const error =
                new app_error();

            error.create(
                'teacher_assignment_id is required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Get Student Subject
        // =========================================

        const studentSubject =
            await StudentSubject.findOne({

                _id:
                    student_subject_id,

                is_active:
                    true

            });


        if (!studentSubject) {

            const error =
                new app_error();

            error.create(
                'student subject not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Student Access
        // =========================================

        const studentAssignment =
            await getStudentAssignmentForUser(
                req,
                studentSubject.student_assignment
            );


        if (!studentAssignment) {

            const error =
                new app_error();

            error.create(
                'you cannot access this student',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Teacher Access
        // =========================================

        const teacherAssignment =
            await getTeacherAssignmentForUser(
                req,
                teacher_assignment_id
            );


        if (!teacherAssignment) {

            const error =
                new app_error();

            error.create(
                'you cannot access this teacher',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Teacher belongs to Subject
        // =========================================

        const subject =
            await Subject.findOne({

                _id:
                    studentSubject.subject,

                academy:
                    getAcademyId(req),

                is_active:
                    true

            });


        if (!subject) {

            const error =
                new app_error();

            error.create(
                'subject not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const teacherExists =
            subject.teachers.some(

                teacher_id =>
                    String(teacher_id) ===
                    String(teacherAssignment.teacher)

            );


        if (!teacherExists) {

            const error =
                new app_error();

            error.create(
                'this teacher is not assigned to this subject',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Change Teacher
        // =========================================

        studentSubject.teacher =
            teacherAssignment._id;


        await studentSubject.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {
                studentSubject
            }

        });

    }
);


// =====================================================
// Change Student Price
// =====================================================

const changeStudentPrice = AsyncWrapper(

    async (req, res, next) => {

        const student_subject_id =
            req.params.student_subject_id;

        const {
            price_per_lesson
        } = req.body;


        if (
            price_per_lesson === undefined
        ) {

            const error =
                new app_error();

            error.create(
                'price_per_lesson is required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        const price =
            Number(price_per_lesson);


        if (
            Number.isNaN(price) ||
            price < 0
        ) {

            const error =
                new app_error();

            error.create(
                'price_per_lesson must be a valid non-negative number',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Get Student Subject
        // =========================================

        const studentSubject =
            await StudentSubject.findOne({

                _id:
                    student_subject_id,

                is_active:
                    true

            });


        if (!studentSubject) {

            const error =
                new app_error();

            error.create(
                'student subject not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Student Access
        // =========================================

        const studentAssignment =
            await getStudentAssignmentForUser(
                req,
                studentSubject.student_assignment
            );


        if (!studentAssignment) {

            const error =
                new app_error();

            error.create(
                'you cannot access this student',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Update Price
        // =========================================

        studentSubject.price_per_lesson =
            price;


        await studentSubject.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {
                studentSubject
            }

        });

    }
);


// =====================================================
// Remove Subject From Student
// =====================================================

const removeSubjectFromStudent = AsyncWrapper(

    async (req, res, next) => {

        const student_subject_id =
            req.params.student_subject_id;


        const studentSubject =
            await StudentSubject.findOne({

                _id:
                    student_subject_id,

                is_active:
                    true

            });


        if (!studentSubject) {

            const error =
                new app_error();

            error.create(
                'student subject not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Student Access
        // =========================================

        const studentAssignment =
            await getStudentAssignmentForUser(
                req,
                studentSubject.student_assignment
            );


        if (!studentAssignment) {

            const error =
                new app_error();

            error.create(
                'you cannot access this student',
                403,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Soft Delete
        // =========================================

        studentSubject.is_active =
            false;

        studentSubject.ended_at =
            new Date();


        await studentSubject.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            message:
                'subject removed from student successfully',

            data: {
                studentSubject
            }

        });

    }
);


module.exports = {

    addSubjectToStudent,

    getStudentSubjects,

    changeStudentTeacher,

    changeStudentPrice,

    removeSubjectFromStudent

};