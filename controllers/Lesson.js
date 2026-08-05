const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Lesson =
    require('../models/Lesson');

const StudentAssignment =
    require('../models/StudentAssignment');

const StudentSubject =
    require('../models/StudentSubject');

const SupervisorAssignment =
    require('../models/SupervisorAssignment');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const user_role =
    require('../utils/UserRole');

const {
    getAcademyId,
    getStudentAssignmentForUser,
    getTeacherAssignmentForUser,
    getLessonForUser
} = require('../utils/AccessScope');


/*
=====================================================
Normalize Lesson Date
=====================================================

Example:

18:00 -> 18:00
18:10 -> 18:00
18:30 -> 18:00
18:59 -> 18:00
=====================================================
*/

const normalizeLessonDate = (value) => {

    const date = new Date(value);


    if (Number.isNaN(date.getTime())) {

        return null;

    }


    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);


    return date;

};


/*
=====================================================
Create Lesson
=====================================================
*/

const createLesson = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        const {
            student_assignment_id,
            student_subject_id,
            teacher_assignment_id,
            lesson_date,
            notes
        } = req.body;


        if (
            !student_assignment_id ||
            !student_subject_id ||
            !teacher_assignment_id ||
            !lesson_date
        ) {

            const error =
                new app_error();

            error.create(
                'student_assignment_id, student_subject_id, teacher_assignment_id and lesson_date are required',
                400,
                http_status_text.FAIL
            );

            return next(error);

        }


        /*
        ================================================
        Normalize date
        ================================================
        */

        const normalizedDate =
            normalizeLessonDate(
                lesson_date
            );


        if (!normalizedDate) {

            const error =
                new app_error();

            error.create(
                'invalid lesson date',
                400,
                http_status_text.FAIL
            );

            return next(error);

        }


        /*
        ================================================
        Check Student
        ================================================
        */

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


        /*
        ================================================
        Check Student Subject
        ================================================
        */

        const studentSubject =
            await StudentSubject.findOne({

                _id:
                    student_subject_id,

                academy_id,

                student_assignment:
                    student_assignment_id,

                is_active: true

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


        /*
        ================================================
        Check Teacher
        ================================================
        */

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


        /*
        ================================================
        Teacher must be assigned to subject
        ================================================
        */

        if (
            String(studentSubject.teacher)
            !==
            String(teacher_assignment_id)
        ) {

            const error =
                new app_error();

            error.create(
                'this teacher is not assigned to this student subject',
                403,
                http_status_text.FAIL
            );

            return next(error);

        }


        /*
        ================================================
        Check duplicate BEFORE create
        ================================================
        */

        const existingLesson =
            await Lesson.findOne({

                academy_id,

                student_assignment:
                    student_assignment_id,

                student_subject:
                    student_subject_id,

                teacher:
                    teacher_assignment_id,

                lesson_date:
                    normalizedDate

            });


        if (existingLesson) {

            const error =
                new app_error();

            error.create(
                'this lesson is already registered for this hour',
                409,
                http_status_text.FAIL
            );

            return next(error);

        }


        /*
        ================================================
        Create Lesson
        ================================================
        */

        try {

            const lesson =
                await Lesson.create({

                    academy_id,

                    student_assignment:
                        studentAssignment._id,

                    student:
                        studentAssignment.student,

                    student_subject:
                        studentSubject._id,

                    teacher:
                        teacherAssignment._id,

                    lesson_date:
                        normalizedDate,

                    notes,

                    status:
                        'scheduled'

                });


            return res.status(201).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    lesson
                }

            });

        } catch (error) {

            /*
            MongoDB duplicate key
            */

            if (
                error.code === 11000
            ) {

                const duplicateError =
                    new app_error();

                duplicateError.create(
                    'this lesson is already registered for this hour',
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


/*
=====================================================
Get Lessons
=====================================================
*/

const getLessons = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        /*
        ================================================
        Academy Admin
        ================================================
        */

        if (
            req.user.role ===
            user_role.academy_admin
        ) {

            const lessons =
                await Lesson.find({

                    academy_id

                })

                .populate('student')

                .populate('student_assignment')

                .populate('student_subject')

                .populate('teacher')

                .sort({
                    lesson_date: -1
                });


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    lessons
                }

            });

        }


        /*
        ================================================
        Supervisor
        ================================================
        */

        if (
            req.user.role ===
            user_role.supervisor
        ) {

            const supervisor =
                await SupervisorAssignment.findOne({

                    supervisor:
                        req.user.id,

                    academy_id,

                    is_active: true

                });


            if (!supervisor) {

                const error =
                    new app_error();

                error.create(
                    'supervisor is not assigned to this academy',
                    403,
                    http_status_text.FAIL
                );

                return next(error);

            }


            const studentAssignments =
                await StudentAssignment.find({

                    academy_id,

                    supervisor:
                        supervisor._id,

                    is_active: true

                }).select('_id');


            const studentAssignmentIds =
                studentAssignments.map(
                    item => item._id
                );


            const lessons =
                await Lesson.find({

                    academy_id,

                    student_assignment: {
                        $in:
                            studentAssignmentIds
                    }

                })

                .populate('student')

                .populate('student_assignment')

                .populate('student_subject')

                .populate('teacher')

                .sort({
                    lesson_date: -1
                });


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    lessons
                }

            });

        }


        const error =
            new app_error();

        error.create(
            'you are not allowed to view lessons',
            403,
            http_status_text.FAIL
        );

        return next(error);

    }
);


/*
=====================================================
Get Student Lessons
=====================================================
*/

const getStudentLessons = AsyncWrapper(

    async (req, res, next) => {

        const student_assignment_id =
            req.params.student_assignment_id;


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


        const academy_id =
            getAcademyId(req);


        const lessons =
            await Lesson.find({

                academy_id,

                student_assignment:
                    studentAssignment._id

            })

            .populate('student')

            .populate('student_subject')

            .populate('teacher')

            .sort({
                lesson_date: -1
            });


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {
                lessons
            }

        });

    }
);


/*
=====================================================
Update Lesson Status
=====================================================
*/

const updateLessonStatus =
    AsyncWrapper(

        async (req, res, next) => {

            const lesson_id =
                req.params.lesson_id;


            const {
                status
            } = req.body;


            if (
                ![
                    'scheduled',
                    'completed',
                    'cancelled'
                ].includes(status)
            ) {

                const error =
                    new app_error();

                error.create(
                    'invalid lesson status',
                    400,
                    http_status_text.FAIL
                );

                return next(error);

            }


            const lesson =
                await getLessonForUser(

                    req,

                    lesson_id

                );


            if (!lesson) {

                const error =
                    new app_error();

                error.create(
                    'you cannot access this lesson',
                    403,
                    http_status_text.FAIL
                );

                return next(error);

            }


            lesson.status =
                status;


            await lesson.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    lesson
                }

            });

        }
    );


/*
=====================================================
Cancel Lesson
=====================================================
*/

const cancelLesson = AsyncWrapper(

    async (req, res, next) => {

        const lesson_id =
            req.params.lesson_id;


        const lesson =
            await getLessonForUser(

                req,

                lesson_id

            );


        if (!lesson) {

            const error =
                new app_error();

            error.create(
                'you cannot access this lesson',
                403,
                http_status_text.FAIL
            );

            return next(error);

        }


        lesson.status =
            'cancelled';


        await lesson.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {
                lesson
            }

        });

    }
);


module.exports = {

    createLesson,

    getLessons,

    getStudentLessons,

    updateLessonStatus,

    cancelLesson

};