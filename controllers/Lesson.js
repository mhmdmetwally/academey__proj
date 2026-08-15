const AsyncWrapper =require('../middleware/AsyncWrapper');

const Lesson =require('../models/Lesson');

const StudentAssignment =require('../models/StudentAssignment');

const StudentSubject =require('../models/StudentSubject');

const TeacherAssignment =require('../models/TeacherAssignment');

const app_error =require('../utils/AppError');

const http_status_text =require('../utils/HttpStatusText');

const {getAcademyId,getStudentAssignmentForUser,getStudentSubjectForUser,getTeacherAssignmentForUser,getLessonForUser} = require('../utils/AccessScope');

// =====================================================// Normalize Lesson Date//// 18:00 -> 18:00// 18:25 -> 18:00// 18:59 -> 18:00// =====================================================

const normalizeLessonDate = (date) => {

const result =
    new Date(date);

if (Number.isNaN(result.getTime())) {
    return null;
}

result.setMinutes(0);
result.setSeconds(0);
result.setMilliseconds(0);

return result;

};

// =====================================================// Create Lesson// =====================================================

const createLesson = AsyncWrapper(async (req, res, next) => {

    const academy_id =
        getAcademyId(req);


    const {
        student_assignment_id,
        student_subject_id,
        teacher_assignment_id,
        lesson_date,
        duration_minutes,
        notes
    } = req.body;


    // =========================================
    // Required fields
    // =========================================

    if (
        !student_assignment_id ||
        !student_subject_id ||
        !teacher_assignment_id ||
        !lesson_date ||
        duration_minutes === undefined
    ) {

        const error =
            new app_error();

        error.create(
            'student_assignment_id, student_subject_id, teacher_assignment_id, lesson_date and duration_minutes are required',
            400,
            http_status_text.FAIL
        );

        return next(error);
    }


    // =========================================
    // Validate duration
    // =========================================

    const duration =
        Number(duration_minutes);


    if (
        !Number.isInteger(duration) ||
        duration <= 0
    ) {

        const error =
            new app_error();

        error.create(
            'duration_minutes must be a positive integer',
            400,
            http_status_text.FAIL
        );

        return next(error);
    }


    // =========================================
    // Normalize lesson date
    // =========================================

    const normalizedDate =
        normalizeLessonDate(lesson_date);


    if (!normalizedDate) {

        const error =
            new app_error();

        error.create(
            'invalid lesson_date',
            400,
            http_status_text.FAIL
        );

        return next(error);
    }


    // =========================================
    // Student Access
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
    // Student Subject Access
    // =========================================

    const studentSubject =
        await getStudentSubjectForUser(
            req,
            student_subject_id
        );


    if (!studentSubject) {

        const error =
            new app_error();

        error.create(
            'student subject not found or you cannot access it',
            404,
            http_status_text.FAIL
        );

        return next(error);
    }


    // =========================================
    // Student Subject must belong to
    // the same StudentAssignment
    // =========================================

    if (
        String(
            studentSubject.student_assignment
        ) !==
        String(student_assignment_id)
    ) {

        const error =
            new app_error();

        error.create(
            'student subject does not belong to this student',
            400,
            http_status_text.FAIL
        );

        return next(error);
    }


    // =========================================
    // Teacher Access
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
            'teacher assignment not found or you cannot access it',
            404,
            http_status_text.FAIL
        );

        return next(error);
    }


    // =========================================
    // Teacher must be the teacher
    // assigned to StudentSubject
    // =========================================

    if (
        String(
            studentSubject.teacher
        ) !==
        String(teacher_assignment_id)
    ) {

        const error =
            new app_error();

        error.create(
            'this teacher is not assigned to this student subject',
            400,
            http_status_text.FAIL
        );

        return next(error);
    }


    // =========================================
    // Same Academy Checks
    // =========================================

    if (
        String(
            studentAssignment.academy_id
        ) !==
        String(academy_id)
    ) {

        const error =
            new app_error();

        error.create(
            'student does not belong to this academy',
            403,
            http_status_text.FAIL
        );

        return next(error);
    }


    if (
        String(
            studentSubject.academy_id
        ) !==
        String(academy_id)
    ) {

        const error =
            new app_error();

        error.create(
            'student subject does not belong to this academy',
            403,
            http_status_text.FAIL
        );

        return next(error);
    }


    if (
        String(
            teacherAssignment.academy_id
        ) !==
        String(academy_id)
    ) {

        const error =
            new app_error();

        error.create(
            'teacher does not belong to this academy',
            403,
            http_status_text.FAIL
        );

        return next(error);
    }


    // =========================================
    // Create Lesson
    // =========================================

    try {

        const lesson =
            await Lesson.create({

                academy_id,

                student_assignment:
                    student_assignment_id,

                student:
                    studentAssignment.student,

                student_subject:
                    student_subject_id,

                teacher:
                    teacher_assignment_id,

                lesson_date:
                    normalizedDate,

                duration_minutes:
                    duration,

                status:
                    'scheduled',

                notes

            });


        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {
                lesson
            }

        });

    } catch (error) {

        // =====================================
        // Duplicate lesson
        // =====================================

        if (
            error &&
            error.code === 11000
        ) {

            const duplicateError =
                new app_error();

            duplicateError.create(
                'a lesson already exists for this student, subject, teacher and hour',
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

// =====================================================// Get All Accessible Lessons// =====================================================

const getLessons = AsyncWrapper(async (req, res, next) => {

    const academy_id =
        getAcademyId(req);


    const filter = {
        academy_id
    };


    // =========================================
    // Optional filters
    // =========================================

    if (
        req.query.student_assignment_id
    ) {

        const studentAssignment =
            await getStudentAssignmentForUser(
                req,
                req.query.student_assignment_id
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


        filter.student_assignment =
            req.query.student_assignment_id;
    }


    if (
        req.query.student_subject_id
    ) {

        const studentSubject =
            await getStudentSubjectForUser(
                req,
                req.query.student_subject_id
            );


        if (!studentSubject) {

            const error =
                new app_error();

            error.create(
                'student subject not found or you cannot access it',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        filter.student_subject =
            req.query.student_subject_id;
    }


    if (
        req.query.teacher_assignment_id
    ) {

        const teacherAssignment =
            await getTeacherAssignmentForUser(
                req,
                req.query.teacher_assignment_id
            );


        if (!teacherAssignment) {

            const error =
                new app_error();

            error.create(
                'teacher assignment not found or you cannot access it',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        filter.teacher =
            req.query.teacher_assignment_id;
    }


    if (req.query.status) {

        filter.status =
            req.query.status;
    }


    // =========================================
    // Date filters
    // =========================================

    if (req.query.from) {

        const from =
            new Date(req.query.from);


        if (Number.isNaN(from.getTime())) {

            const error =
                new app_error();

            error.create(
                'invalid from date',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        filter.lesson_date = {
            ...filter.lesson_date,
            $gte: from
        };
    }


    if (req.query.to) {

        const to =
            new Date(req.query.to);


        if (Number.isNaN(to.getTime())) {

            const error =
                new app_error();

            error.create(
                'invalid to date',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        filter.lesson_date = {
            ...filter.lesson_date,
            $lte: to
        };
    }


    // =========================================
    // Get Lessons
    // =========================================

    const lessons =
        await Lesson.find(filter)

            .populate(
                'student',
                'name phone'
            )

            .populate(
                'student_assignment'
            )

            .populate(
                'student_subject'
            )

            .populate({
                path: 'teacher',
                populate: {
                    path: 'teacher'
                }
            })

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

// =====================================================// Get Student Lessons// =====================================================

const getStudentLessons = AsyncWrapper(async (req, res, next) => {

    const {
        student_assignment_id
    } = req.params;


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


    const lessons =
        await Lesson.find({

            academy_id:
                getAcademyId(req),

            student_assignment:
                student_assignment_id

        })

            .populate(
                'student_subject'
            )

            .populate({
                path: 'teacher',
                populate: {
                    path: 'teacher'
                }
            })

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

// =====================================================// Update Lesson Status// =====================================================

const updateLessonStatus = AsyncWrapper(async (req, res, next) => {

    const {
        lesson_id
    } = req.params;


    const {
        status
    } = req.body;


    const allowedStatuses = [
        'scheduled',
        'completed',
        'cancelled'
    ];


    if (
        !allowedStatuses.includes(status)
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
            'lesson not found or you cannot access it',
            404,
            http_status_text.FAIL
        );

        return next(error);
    }


    if (
        lesson.status ===
        'cancelled' &&
        status !== 'cancelled'
    ) {

        const error =
            new app_error();

        error.create(
            'cancelled lesson cannot be reactivated',
            400,
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


module.exports = {

createLesson,

getLessons,

getStudentLessons,

updateLessonStatus,


};