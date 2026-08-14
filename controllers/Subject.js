const mongoose =
    require('mongoose');


const AsyncWrapper =
    require('../middleware/AsyncWrapper');


const Subject =
    require('../models/Subject');


const Teacher =
    require('../models/Teacher');

const TeacherAssignment =
    require('../models/TeacherAssignment');

const app_error =
    require('../utils/AppError');


const http_status_text =
    require('../utils/HttpStatusText');


const user_role =
    require('../utils/UserRole');
const TeacherAssignment = require('../models/TeacherAssignment');


// =====================================================
// Create Subject
// =====================================================
// Academy Admin only
// =====================================================

const createSubject =
    AsyncWrapper(

        async (req, res, next) => {

            const {
                name,
                student_price
            } = req.body;


            // =========================================
            // Academy Admin id = Academy id
            // =========================================

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


            // =========================================
            // Validate price
            // =========================================

            const price =
                Number(student_price);


            if (
                Number.isNaN(price) ||
                price < 0
            ) {

                const error =
                    new app_error();

                error.create(
                    'student_price must be a valid non-negative number',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Check duplicate
            // inside same academy
            // =========================================

            const existing_subject =
                await Subject.findOne({

                    name:
                        name.trim(),

                    academy_id:
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

                    name:
                        name.trim(),

                    academy_id:
                        academy_id,

                    teachers:
                        [],

                    student_price:
                        price

                });


            await subject.save();


            // =========================================
            // Get created subject
            // =========================================

            const subject_data =
                await Subject.findById(
                    subject._id
                )
                .populate(
                    'academy_id',
                    'academy_name academy_code'
                )
                .populate(
                    'teachers'
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
// =====================================================

const getSubjects = AsyncWrapper(async (req, res, next) => {
    let academy_id;

    // 1. Academy Admin
    if (req.user.role === user_role.academy_admin) {
        academy_id = req.user.id;
    }
    
    // 2. Supervisor (المشرف فقط)
    else if (req.user.role === user_role.supervisor) {
        academy_id = req.user.academy_id;
    }

    // 3. Teacher
    else if (req.user.role === user_role.teacher) {
        const teacher = await Teacher.findOne({ user: req.user.id });
        if (teacher) {
            academy_id = teacher.academy_id;
        }
    }

    // إذا لم يكن أي من الأدوار المسموحة أو لم يُعثر على academy_id
    if (!academy_id) {
        const error = new app_error();
        error.create(
            'Unauthorized or missing academy_id',
            403,
            http_status_text.FAIL
        );
        return next(error);
    }

    // جلب المواد الدراسية الخاصة بالأكاديمية
    const subjects = await Subject.find({ academy_id: academy_id })
        .populate('teachers')
        .populate('academy_id', 'academy_name academy_code')
        .sort({ createdAt: -1 });

    return res.status(200).json({
        status: http_status_text.SUCCESS,
        data: {
            subjects
        }
    });
});

// =====================================================
// Get Single Subject
// =====================================================

const getSingleSubject =
    AsyncWrapper(

        async (req, res, next) => {

            const subject_id =
                req.params.subject_id;


            // =========================================
            // Validate ID
            // =========================================

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


            // =========================================
            // Academy required
            // =========================================

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

                        academy_id:
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

                    academy_id:
                        academy_id

                })
                .populate(
                    'teachers'
                )
                .populate(
                    'academy_id',
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

const updateSubject =
    AsyncWrapper(

        async (req, res, next) => {

            const subject_id =
                req.params.subject_id;


            const academy_id =
                req.user.id;


            // =========================================
            // Validate subject id
            // =========================================

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


            // =========================================
            // Find subject
            // =========================================

            const subject =
                await Subject.findOne({

                    _id:
                        subject_id,

                    academy_id:
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

            if (
                name !== undefined
            ) {

                if (
                    !name.trim()
                ) {

                    const error =
                        new app_error();

                    error.create(
                        'name cannot be empty',
                        400,
                        http_status_text.FAIL
                    );

                    return next(error);
                }


                const duplicate =
                    await Subject.findOne({

                        name:
                            name.trim(),

                        academy_id:
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

                const price =
                    Number(student_price);


                if (
                    Number.isNaN(price) ||
                    price < 0
                ) {

                    const error =
                        new app_error();

                    error.create(
                        'student_price must be a valid non-negative number',
                        400,
                        http_status_text.FAIL
                    );

                    return next(error);
                }


                subject.student_price =
                    price;

            }


            // =========================================
            // Active
            // =========================================

            if (
                is_active !== undefined
            ) {

                if (
                    typeof is_active !==
                    'boolean'
                ) {

                    const error =
                        new app_error();

                    error.create(
                        'is_active must be boolean',
                        400,
                        http_status_text.FAIL
                    );

                    return next(error);
                }


                subject.is_active =
                    is_active;

            }


            await subject.save();


            // =========================================
            // Return updated
            // =========================================

            const updated_subject =
                await Subject.findById(
                    subject._id
                )
                .populate(
                    'teachers'
                )
                .populate(
                    'academy_id',
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
// =====================================================

const addTeacherToSubject =
    AsyncWrapper(

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

                    academy_id:
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
            // Find Teacher
            // =========================================

            const teacher =
                await TeacherAssignment.findOne({

                    _id:
                        teacher_id,

                    academy_id:
                        academy_id,

                    is_active:
                        true

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
            // Duplicate
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
                    'academy_id',
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

const removeTeacherFromSubject =
    AsyncWrapper(

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

                    academy_id:
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

                    academy_id:
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
                    'academy_id',
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
// Export
// =====================================================

module.exports = {

    createSubject,

    getSubjects,

    getSingleSubject,

    updateSubject,

    addTeacherToSubject,

    removeTeacherFromSubject

};