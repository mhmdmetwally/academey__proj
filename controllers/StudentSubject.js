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
} =
    require('../utils/AccessScope');


// =====================================================
// Get YYYY-MM
// =====================================================

const getMonthString =
    (date = new Date()) => {

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                '0'
            );

        return `${year}-${month}`;

    };


// =====================================================
// Validate Month
// =====================================================

const isValidMonth =
    (month) => {

        return /^\d{4}-(0[1-9]|1[0-2])$/
            .test(month);

    };


// =====================================================
// Add Subject To Student
// =====================================================

const addSubjectToStudent =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);


            const student_assignment_id =
                req.params.student_assignment_id;


            const {
                subject_id,
                teacher_assignment_id,
                price_per_lesson,
                monthly_lessons,
                note
            } =
                req.body;


            // =========================================
            // Required
            // =========================================

            if (
                !subject_id ||
                !teacher_assignment_id ||
                price_per_lesson === undefined ||
                monthly_lessons === undefined
            ) {

                const error =
                    new app_error();

                error.create(
                    'subject_id, teacher_assignment_id, price_per_lesson and monthly_lessons are required',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Validate monthly lessons
            // =========================================

            const monthlyLessons =
                Number(
                    monthly_lessons
                );


            if (
                !Number.isInteger(
                    monthlyLessons
                ) ||
                monthlyLessons < 0
            ) {

                const error =
                    new app_error();

                error.create(
                    'monthly_lessons must be a non-negative integer',
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
            // Subject
            // =========================================

            const subject =
                await Subject.findOne({

                    _id:
                        subject_id,

                    academy_id:
                        academy_id,

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


            // =========================================
            // Teacher
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
            // Teacher belongs to Subject
            // =========================================

            const teacherExists =
                subject.teachers.some(

                    teacherAssignmentId =>

                        String(
                            teacherAssignmentId
                        ) ===
                        String(
                            teacherAssignment._id
                        )

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
                Number(
                    price_per_lesson
                );


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
            // Duplicate
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
            // Current Month
            // =========================================

            const currentMonth =
                getMonthString();


            // =========================================
            // Create
            // =========================================

            try {

                const studentSubject =
                    await StudentSubject.create({

                        academy_id:

                            academy_id,


                        student_assignment:

                            studentAssignment._id,


                        subject:

                            subject._id,


                        teacher:

                            teacherAssignment._id,


                        price_per_lesson:

                            price,


                        monthly_lessons:

                            monthlyLessons,


                        monthly_lessons_history: [

                            {

                                month:
                                    currentMonth,

                                lessons:
                                    monthlyLessons,

                                note:
                                    note ||
                                    'Initial monthly lessons'

                            }

                        ],


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

            }

            catch (error) {

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

const getStudentSubjects =
    AsyncWrapper(

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

const changeStudentTeacher =
    AsyncWrapper(

        async (req, res, next) => {

            const student_subject_id =
                req.params.student_subject_id;


            const {
                teacher_assignment_id
            } =
                req.body;


            if (
                !teacher_assignment_id
            ) {

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
            // Student Subject
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
            // Student Access
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
                    'you cannot access this teacher',
                    403,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Subject
            // =========================================

            const subject =
                await Subject.findOne({

                    _id:
                        studentSubject.subject,

                    academy_id:
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


            // =========================================
            // Teacher belongs to Subject
            // =========================================

            const teacherExists =
            subject.teachers.some(

                teacherAssignmentId =>

                    String(
                        teacherAssignmentId
                    ) ===
                    String(
                        teacherAssignment._id
                    )

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

const changeStudentPrice =
    AsyncWrapper(

        async (req, res, next) => {

            const student_subject_id =
                req.params.student_subject_id;


            const {
                price_per_lesson
            } =
                req.body;


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
                Number(
                    price_per_lesson
                );


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
// Change Monthly Lessons
// =====================================================

const changeMonthlyLessons =
    AsyncWrapper(

        async (req, res, next) => {

            const student_subject_id =
                req.params.student_subject_id;


            const {
                monthly_lessons,
                effective_month,
                note
            } =
                req.body;


            // =========================================
            // Required
            // =========================================

            if (
                monthly_lessons === undefined ||
                !effective_month
            ) {

                const error =
                    new app_error();

                error.create(
                    'monthly_lessons and effective_month are required',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Validate lessons
            // =========================================

            const lessons =
                Number(
                    monthly_lessons
                );


            if (
                !Number.isInteger(lessons) ||
                lessons < 0
            ) {

                const error =
                    new app_error();

                error.create(
                    'monthly_lessons must be a non-negative integer',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Validate month
            // =========================================

            if (
                !isValidMonth(
                    effective_month
                )
            ) {

                const error =
                    new app_error();

                error.create(
                    'effective_month must be in YYYY-MM format',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Student Subject
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
            // Access
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
            // Check existing month
            // =========================================

            const existingIndex =
                studentSubject
                    .monthly_lessons_history
                    .findIndex(

                        item =>
                            item.month ===
                            effective_month

                    );


            // =========================================
            // Existing month
            // =========================================

            if (
                existingIndex !== -1
            ) {

                const existing =
                    studentSubject
                        .monthly_lessons_history[
                            existingIndex
                        ];


                existing.lessons =
                    lessons;


                existing.note =
                    note ||
                    existing.note;

            }


            // =========================================
            // New month
            // =========================================

            else {

                studentSubject
                    .monthly_lessons_history
                    .push({

                        month:
                            effective_month,

                        lessons:

                            lessons,

                        note:
                            note ||
                            null

                    });

            }


            // =========================================
            // Current month
            // =========================================

            const currentMonth =
                getMonthString();


            const currentHistory =
                studentSubject
                    .monthly_lessons_history
                    .find(

                        item =>
                            item.month ===
                            currentMonth

                    );


            if (currentHistory) {

                studentSubject.monthly_lessons =
                    currentHistory.lessons;

            }


            // =========================================
            // Sort History
            // =========================================

            studentSubject
                .monthly_lessons_history
                .sort(

                    (a, b) =>
                        a.month.localeCompare(
                            b.month
                        )

                );


            // =========================================
            // Save
            // =========================================

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
// Remove Subject
// =====================================================

const removeSubjectFromStudent =
    AsyncWrapper(

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


// =====================================================
// Export
// =====================================================

module.exports = {

    addSubjectToStudent,

    getStudentSubjects,

    changeStudentTeacher,

    changeStudentPrice,

    changeMonthlyLessons,

    removeSubjectFromStudent

};