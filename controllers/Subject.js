const mongoose = require('mongoose');

const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Subject =
    require('../models/Subject');

const Teacher =
    require('../models/Teacher');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const user_role =
    require('../utils/UserRole');


// =====================================================
// Create Subject
// =====================================================
// Academy Admin only
// =====================================================

const createSubject = AsyncWrapper(

    async (req, res, next) => {

        const {
            name,
            student_price
        } = req.body;


        // Academy Admin id = academy id
        const academy_id =
            req.user.id;


        // =========================================
        // Validation
        // =========================================

        if (
            !name ||
            student_price === undefined
        ) {

            const error =
                new app_error();

            error.create(
                'name and student_price are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (student_price < 0) {

            const error =
                new app_error();

            error.create(
                'student_price cannot be negative',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check duplicate subject
        // inside same academy
        // =========================================

        const existing_subject =
            await Subject.findOne({

                name: name.trim(),

                academy:
                    academy_id

            });


        if (existing_subject) {

            const error =
                new app_error();

            error.create(
                'this subject already exists in this academy',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Create
        // =========================================

        const subject =
            new Subject({

                name: name.trim(),

                academy:
                    academy_id,

                teachers: [],

                student_price

            });


        await subject.save();


        const subject_data =
            await Subject.findById(
                subject._id
            )
            .populate(
                'academy',
                'academy_name academy_code'
            );


        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {

                subject:
                    subject_data

            }

        });

    }

);


// =====================================================
// Get All Subjects
// =====================================================
// Academy Admin / Supervisor / Teacher
//
// Everyone gets only subjects belonging to the
// academy they are currently working in.
//
// For Teacher we receive academy_id from query:
// GET /subject?academy_id=...
// =====================================================

const getSubjects = AsyncWrapper(

    async (req, res, next) => {

        let academy_id;


        // =========================================
        // Academy Admin
        // =========================================

        if (
            req.user.role ===
            user_role.academy_admin
        ) {

            academy_id =
                req.user.id;

        }


        // =========================================
        // Supervisor / Family
        // =========================================

        else if (
            req.user.academy_id
        ) {

            academy_id =
                req.user.academy_id;

        }


        // =========================================
        // Teacher
        // =========================================

        else if (
            req.user.role ===
            user_role.teacher
        ) {

            academy_id =
                req.query.academy_id;

        }


        if (!academy_id) {

            const error =
                new app_error();

            error.create(
                'academy_id is required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Teacher security
        // =========================================
        // If current user is Teacher, make sure
        // he actually belongs to this academy.
        // =========================================

        if (
            req.user.role ===
            user_role.teacher
        ) {

            const teacher =
                await Teacher.findOne({

                    user:
                        req.user.id,

                    academy_id

                });


            if (!teacher) {

                const error =
                    new app_error();

                error.create(
                    'you do not belong to this academy',
                    403,
                    http_status_text.FAIL
                );

                return next(error);
            }

        }


        // =========================================
        // Get subjects
        // =========================================

        const subjects =
            await Subject.find({

                academy:
                    academy_id

            })

            .populate(
                'teachers'
            )

            .populate(
                'academy',
                'academy_name academy_code'
            );


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
// Get Single Subject
// =====================================================

const getSingleSubject = AsyncWrapper(

    async (req, res, next) => {

        const subject_id =
            req.params.subject_id;


        if (
            !mongoose.Types.ObjectId.isValid(
                subject_id
            )
        ) {

            const error =
                new app_error();

            error.create(
                'invalid subject id',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        let academy_id;


        // =========================================
        // Academy Admin
        // =========================================

        if (
            req.user.role ===
            user_role.academy_admin
        ) {

            academy_id =
                req.user.id;

        }


        // =========================================
        // Supervisor
        // =========================================

        else if (
            req.user.academy_id
        ) {

            academy_id =
                req.user.academy_id;

        }


        // =========================================
        // Teacher
        // =========================================

        else if (
            req.user.role ===
            user_role.teacher
        ) {

            academy_id =
                req.query.academy_id;

        }


        if (!academy_id) {

            const error =
                new app_error();

            error.create(
                'academy_id is required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Teacher security
        // =========================================

        if (
            req.user.role ===
            user_role.teacher
        ) {

            const teacher =
                await Teacher.findOne({

                    user:
                        req.user.id,

                    academy_id

                });


            if (!teacher) {

                const error =
                    new app_error();

                error.create(
                    'you do not belong to this academy',
                    403,
                    http_status_text.FAIL
                );

                return next(error);
            }

        }


        // =========================================
        // Get subject
        // =========================================

        const subject =
            await Subject.findOne({

                _id:
                    subject_id,

                academy:
                    academy_id

            })

            .populate(
                'teachers'
            )

            .populate(
                'academy',
                'academy_name academy_code'
            );


        if (!subject) {

            const error =
                new app_error();

            error.create(
                'subject not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                subject

            }

        });

    }

);


// =====================================================
// Update Subject
// =====================================================
// Academy Admin only
// =====================================================

const updateSubject = AsyncWrapper(

    async (req, res, next) => {

        const subject_id =
            req.params.subject_id;


        const academy_id =
            req.user.id;


        const subject =
            await Subject.findOne({

                _id:
                    subject_id,

                academy:
                    academy_id

            });


        if (!subject) {

            const error =
                new app_error();

            error.create(
                'subject not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        const {
            name,
            student_price,
            is_active
        } = req.body;


        // =========================================
        // Name
        // =========================================

        if (name !== undefined) {

            const duplicate =
                await Subject.findOne({

                    name:
                        name.trim(),

                    academy:
                        academy_id,

                    _id: {
                        $ne:
                            subject_id
                    }

                });


            if (duplicate) {

                const error =
                    new app_error();

                error.create(
                    'another subject with this name already exists',
                    409,
                    http_status_text.FAIL
                );

                return next(error);
            }


            subject.name =
                name.trim();

        }


        // =========================================
        // Student Price
        // =========================================

        if (
            student_price !== undefined
        ) {

            if (
                student_price < 0
            ) {

                const error =
                    new app_error();

                error.create(
                    'student_price cannot be negative',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            subject.student_price =
                student_price;

        }


        // =========================================
        // Active
        // =========================================

        if (
            is_active !== undefined
        ) {

            subject.is_active =
                is_active;

        }


        await subject.save();


        const updated_subject =
            await Subject.findById(
                subject._id
            )

            .populate(
                'teachers'
            )

            .populate(
                'academy',
                'academy_name academy_code'
            );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                subject:
                    updated_subject

            }

        });

    }

);


// =====================================================
// Add Teacher To Subject
// =====================================================
// Academy Admin only
//
// IMPORTANT:
// Teacher assignment and Subject MUST belong
// to the same academy.
// =====================================================

const addTeacherToSubject = AsyncWrapper(

    async (req, res, next) => {

        const {
            subject_id,
            teacher_id
        } = req.params;


        const academy_id =
            req.user.id;


        // =========================================
        // Find Subject inside academy
        // =========================================

        const subject =
            await Subject.findOne({

                _id:
                    subject_id,

                academy:
                    academy_id

            });


        if (!subject) {

            const error =
                new app_error();

            error.create(
                'subject not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Find Teacher assignment
        // =========================================

        const teacher =
            await Teacher.findOne({

                _id:
                    teacher_id,

                academy_id,

                is_active: true

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


        // =========================================
        // Check duplicate
        // =========================================

        const already_exists =
            subject.teachers.some(

                id =>
                    id.toString() ===
                    teacher._id.toString()

            );


        if (already_exists) {

            const error =
                new app_error();

            error.create(
                'teacher is already assigned to this subject',
                409,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Add Teacher
        // =========================================

        subject.teachers.push(
            teacher._id
        );


        await subject.save();


        const updated_subject =
            await Subject.findById(
                subject._id
            )

            .populate(
                'teachers'
            )

            .populate(
                'academy',
                'academy_name academy_code'
            );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                subject:
                    updated_subject

            }

        });

    }

);


// =====================================================
// Remove Teacher From Subject
// =====================================================

const removeTeacherFromSubject = AsyncWrapper(

    async (req, res, next) => {

        const {
            subject_id,
            teacher_id
        } = req.params;


        const academy_id =
            req.user.id;


        // =========================================
        // Find Subject
        // =========================================

        const subject =
            await Subject.findOne({

                _id:
                    subject_id,

                academy:
                    academy_id

            });


        if (!subject) {

            const error =
                new app_error();

            error.create(
                'subject not found in this academy',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Teacher
        // =========================================

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


        // =========================================
        // Remove
        // =========================================

        const old_length =
            subject.teachers.length;


        subject.teachers =
            subject.teachers.filter(

                id =>
                    id.toString() !==
                    teacher_id

            );


        if (
            subject.teachers.length ===
            old_length
        ) {

            const error =
                new app_error();

            error.create(
                'teacher is not assigned to this subject',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        await subject.save();


        const updated_subject =
            await Subject.findById(
                subject._id
            )

            .populate(
                'teachers'
            )

            .populate(
                'academy',
                'academy_name academy_code'
            );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                subject:
                    updated_subject

            }

        });

    }

);


module.exports = {

    createSubject,

    getSubjects,

    getSingleSubject,

    updateSubject,

    addTeacherToSubject,

    removeTeacherFromSubject

};

