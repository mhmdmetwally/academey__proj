const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const StudentAssignment =
    require('../models/StudentAssignment');

const StudentSubject =
    require('../models/StudentSubject');

const Subject =
    require('../models/Subject');

const TeacherAssignment =
    require('../models/TeacherAssignment');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');


// =====================================================
// Add Subject To Student
// =====================================================

const addSubjectToStudent = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;

        const student_assignment_id =
            req.params.student_assignment_id;

        const {
            subject_id,
            teacher_assignment_id
        } = req.body;


        if (
            !subject_id ||
            !teacher_assignment_id
        ) {

            const error =
                new app_error();

            error.create(
                'subject_id and teacher_assignment_id are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Check Student Assignment
        // =================================================

        const studentAssignment =
            await StudentAssignment.findOne({

                _id:
                    student_assignment_id,

                academy_id,

                is_active: true

            });


        if (!studentAssignment) {

            const error =
                new app_error();

            error.create(
                'student does not belong to this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Check Subject
        // =================================================

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
                'subject does not belong to this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Check Teacher Assignment
        // =================================================

        const teacherAssignment =
            await TeacherAssignment.findOne({

                _id:
                    teacher_assignment_id,

                academy_id,

                is_active: true

            });


        if (!teacherAssignment) {

            const error =
                new app_error();

            error.create(
                'teacher does not belong to this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Check Existing
        // =================================================

        const existing =
            await StudentSubject.findOne({

                student:
                    studentAssignment.student,

                academy_id,

                subject:
                    subject_id

            });


        if (existing) {

            const error =
                new app_error();

            error.create(
                'student already has this subject in this academy',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Create
        // =================================================

        const studentSubject =
            new StudentSubject({

                student:
                    studentAssignment.student,

                student_assignment:
                    studentAssignment._id,

                academy_id,

                subject:
                    subject_id,

                teacher:
                    teacher_assignment_id,

                is_active: true

            });


        await studentSubject.save();


        const result =
            await StudentSubject
                .findById(
                    studentSubject._id
                )

                .populate(
                    'student'
                )

                .populate(
                    'student_assignment'
                )

                .populate(
                    'academy_id',
                    'academy_name academy_code'
                )

                .populate(
                    'subject'
                )

                .populate({
                    path: 'teacher',
                    populate: {
                        path: 'teacher',
                        populate: {
                            path: 'user',
                            select: 'name phone'
                        }
                    }
                });


        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {

                student_subject:
                    result

            }

        });

    }
);


// =====================================================
// Get Student Subjects
// =====================================================

const getStudentSubjects = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            req.user.id;

        const student_assignment_id =
            req.params.student_assignment_id;


        const studentAssignment =
            await StudentAssignment.findOne({

                _id:
                    student_assignment_id,

                academy_id,

                is_active: true

            });


        if (!studentAssignment) {

            const error =
                new app_error();

            error.create(
                'student does not belong to this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const subjects =
            await StudentSubject
                .find({

                    student:
                        studentAssignment.student,

                    academy_id,

                    is_active: true

                })

                .populate(
                    'subject'
                )

                .populate({
                    path: 'teacher',
                    populate: {
                        path: 'teacher',
                        populate: {
                            path: 'user',
                            select: 'name phone'
                        }
                    }
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

            const academy_id =
                req.user.id;

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


            const studentSubject =
                await StudentSubject.findOne({

                    _id:
                        student_subject_id,

                    academy_id,

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


            const teacherAssignment =
                await TeacherAssignment.findOne({

                    _id:
                        teacher_assignment_id,

                    academy_id,

                    is_active: true

                });


            if (!teacherAssignment) {

                const error =
                    new app_error();

                error.create(
                    'teacher does not belong to this academy',
                    404,
                    http_status_text.FAIL
                );

                return next(error);
            }


            studentSubject.teacher =
                teacherAssignment._id;


            await studentSubject.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    student_subject:
                        studentSubject

                }

            });

        }
    );


// =====================================================
// Remove Student Subject
// =====================================================

const removeSubjectFromStudent =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                req.user.id;

            const student_subject_id =
                req.params.student_subject_id;


            const studentSubject =
                await StudentSubject.findOne({

                    _id:
                        student_subject_id,

                    academy_id

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


            studentSubject.is_active =
                false;


            await studentSubject.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    student_subject:
                        studentSubject

                }

            });

        }
    );


module.exports = {

    addSubjectToStudent,

    getStudentSubjects,

    changeStudentTeacher,

    removeSubjectFromStudent

};