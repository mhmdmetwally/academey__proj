const mongoose = require('mongoose');

const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const TeacherPayroll =
    require('../models/TeacherPayroll');

const Lesson =
    require('../models/Lesson');

const Expense =
    require('../models/Expense');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const {
    getAcademyId,
    getTeacherAssignmentForUser
} = require('../utils/AccessScope');


// =====================================================
// Helpers
// =====================================================

const isValidBillingMonth = (month) => {

    return /^\d{4}-(0[1-9]|1[0-2])$/.test(
        month
    );

};


const getMonthDateRange = (
    billing_month
) => {

    const [
        year,
        month
    ] =
        billing_month
            .split('-')
            .map(Number);

    const from =
        new Date(
            Date.UTC(
                year,
                month - 1,
                1,
                0,
                0,
                0,
                0
            )
        );

    const to =
        new Date(
            Date.UTC(
                year,
                month,
                0,
                23,
                59,
                59,
                999
            )
        );

    return {
        from,
        to
    };

};


const roundMoney = (value) => {

    return Math.round(
        (Number(value) + Number.EPSILON) * 100
    ) / 100;

};


const createError = (
    message,
    statusCode
) => {

    const error =
        new app_error();

    error.create(
        message,
        statusCode,
        http_status_text.FAIL
    );

    return error;

};


// =====================================================
// Generate Payroll
// =====================================================

const generatePayroll =
    AsyncWrapper(
        async (
            req,
            res,
            next
        ) => {

            const academy_id =
                getAcademyId(req);

            const {
                teacher_assignment_id,
                billing_month,
                notes
            } =
                req.body;


            // =========================================
            // Required
            // =========================================

            if (
                !teacher_assignment_id ||
                !billing_month
            ) {

                return next(
                    createError(
                        'teacher_assignment_id and billing_month are required',
                        400
                    )
                );

            }


            // =========================================
            // Validate Month
            // =========================================

            if (
                !isValidBillingMonth(
                    billing_month
                )
            ) {

                return next(
                    createError(
                        'billing_month must be in YYYY-MM format',
                        400
                    )
                );

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

                return next(
                    createError(
                        'teacher assignment not found or you cannot access it',
                        404
                    )
                );

            }


            // =========================================
            // Same Academy
            // =========================================

            if (
                String(
                    teacherAssignment.academy_id
                ) !==
                String(academy_id)
            ) {

                return next(
                    createError(
                        'teacher does not belong to this academy',
                        403
                    )
                );

            }


            // =========================================
            // Existing Payroll
            // =========================================

            const existingPayroll =
                await TeacherPayroll.findOne({

                    academy_id,

                    teacher_assignment:
                        teacher_assignment_id,

                    billing_month

                });


            if (existingPayroll) {

                return next(
                    createError(
                        'payroll already exists for this teacher and month',
                        409
                    )
                );

            }


            // =========================================
            // Month Range
            // =========================================

            const {
                from,
                to
            } =
                getMonthDateRange(
                    billing_month
                );


            // =========================================
            // Completed Lessons
            // =========================================

            const lessons =
                await Lesson.find({

                    academy_id,

                    teacher:
                        teacher_assignment_id,

                    lesson_date: {
                        $gte: from,
                        $lte: to
                    },

                    status:
                        'completed'

                })
                    .sort({
                        lesson_date: 1
                    });


            // =========================================
            // No Lessons
            // =========================================

            if (
                lessons.length === 0
            ) {

                return next(
                    createError(
                        'cannot generate payroll because this teacher has no completed lessons in this month',
                        400
                    )
                );

            }


            // =========================================
            // Price Snapshot
            // =========================================

            const pricePerLesson =
                Number(
                    teacherAssignment.price_per_lesson
                );


            if (
                Number.isNaN(
                    pricePerLesson
                ) ||
                pricePerLesson < 0
            ) {

                return next(
                    createError(
                        'teacher price per lesson is invalid',
                        400
                    )
                );

            }


            // =========================================
            // Calculate Lessons
            // =========================================

            const lessonSnapshots = [];

            let totalUnits = 0;

            let baseAmount = 0;


            for (
                const lesson
                of lessons
            ) {

                const lessonUnits =
                    Number(
                        lesson.duration_minutes
                    ) / 60;


                const lessonAmount =
                    roundMoney(
                        lessonUnits *
                        pricePerLesson
                    );


                totalUnits +=
                    lessonUnits;


                baseAmount +=
                    lessonAmount;


                lessonSnapshots.push({

                    lesson:
                        lesson._id,

                    lesson_date:
                        lesson.lesson_date,

                    duration_minutes:
                        lesson.duration_minutes,

                    lesson_units:
                        Number(
                            lessonUnits.toFixed(4)
                        ),

                    price_per_lesson:
                        pricePerLesson,

                    amount:
                        lessonAmount

                });

            }


            // =========================================
            // Final Base Amount
            // =========================================

            totalUnits =
                Number(
                    totalUnits.toFixed(4)
                );


            baseAmount =
                roundMoney(
                    baseAmount
                );


            // =========================================
            // Create Payroll
            //
            // No discounts initially
            // =========================================

            try {

                const payroll =
                    await TeacherPayroll.create({

                        academy_id,

                        teacher_assignment:
                            teacherAssignment._id,

                        teacher:
                            teacherAssignment.teacher,

                        billing_month,

                        lessons:
                            lessonSnapshots,

                        total_lessons:
                            lessons.length,

                        total_units:
                            totalUnits,

                        price_per_lesson:
                            pricePerLesson,

                        base_amount:
                            baseAmount,

                        discounts:
                            [],

                        discount_amount:
                            0,

                        total_amount:
                            baseAmount,

                        paid_amount:
                            0,

                        remaining_amount:
                            baseAmount,

                        status:
                            'pending',

                        paid_at:
                            null,

                        generated_at:
                            new Date(),

                        notes

                    });


                return res.status(201).json({

                    status:
                        http_status_text.SUCCESS,

                    data: {
                        payroll
                    }

                });

            } catch (error) {

                if (
                    error &&
                    error.code === 11000
                ) {

                    return next(
                        createError(
                            'payroll already exists for this teacher and month',
                            409
                        )
                    );

                }

                return next(error);

            }

        }
    );


// =====================================================
// Add Discount
// =====================================================
//
// Academy Admin only
//
// Body:
//
// {
//     "amount": 200,
//     "note": "خصم غياب"
// }
//
// =====================================================

const addDiscount =
    AsyncWrapper(
        async (
            req,
            res,
            next
        ) => {

            const academy_id =
                getAcademyId(req);


            // =========================================
            // Get Payroll
            // =========================================

            const payroll =
                await TeacherPayroll.findOne({

                    _id:
                        req.params.payroll_id,

                    academy_id

                });


            if (!payroll) {

                return next(
                    createError(
                        'payroll not found',
                        404
                    )
                );

            }


            // =========================================
            // Verify Teacher Assignment
            // =========================================

            const teacherAssignment =
                await getTeacherAssignmentForUser(
                    req,
                    payroll.teacher_assignment
                );


            if (!teacherAssignment) {

                return next(
                    createError(
                        'you cannot access this payroll',
                        403
                    )
                );

            }


            // =========================================
            // Cannot Modify Cancelled Payroll
            // =========================================

            if (
                payroll.status ===
                'cancelled'
            ) {

                return next(
                    createError(
                        'cannot add discount to a cancelled payroll',
                        400
                    )
                );

            }


            // =========================================
            // Cannot Modify After Payment
            // =========================================

            if (
                Number(
                    payroll.paid_amount
                ) > 0
            ) {

                return next(
                    createError(
                        'cannot add discount after payment has started',
                        400
                    )
                );

            }


            // =========================================
            // Body
            // =========================================

            const {
                amount,
                note
            } =
                req.body;


            // =========================================
            // Required
            // =========================================

            if (
                amount === undefined ||
                amount === null ||
                !note
            ) {

                return next(
                    createError(
                        'amount and note are required',
                        400
                    )
                );

            }


            // =========================================
            // Validate Amount
            // =========================================

            const discountAmount =
                Number(amount);


            if (
                !Number.isFinite(
                    discountAmount
                ) ||
                discountAmount <= 0
            ) {

                return next(
                    createError(
                        'discount amount must be greater than 0',
                        400
                    )
                );

            }


            const roundedDiscount =
                roundMoney(
                    discountAmount
                );


            // =========================================
            // Cannot Discount More Than Base
            // =========================================

            if (
                roundedDiscount >
                payroll.base_amount -
                payroll.discount_amount
            ) {

                return next(
                    createError(
                        'discount cannot be greater than the remaining salary before discount',
                        400
                    )
                );

            }


            // =========================================
            // Add Discount
            // =========================================

            payroll.discounts.push({

                amount:
                    roundedDiscount,

                note:
                    String(note).trim(),

                created_at:
                    new Date()

            });


            // =========================================
            // Update Discount Total
            // =========================================

            payroll.discount_amount =
                roundMoney(
                    Number(
                        payroll.discount_amount
                    ) +
                    roundedDiscount
                );


            // =========================================
            // Calculate Final Salary
            // =========================================

            payroll.total_amount =
                roundMoney(
                    Number(
                        payroll.base_amount
                    ) -
                    Number(
                        payroll.discount_amount
                    )
                );


            // =========================================
            // Update Remaining
            // =========================================

            payroll.remaining_amount =
                roundMoney(
                    Number(
                        payroll.total_amount
                    ) -
                    Number(
                        payroll.paid_amount
                    )
                );


            // =========================================
            // Status
            // =========================================

            if (
                payroll.remaining_amount <= 0
            ) {

                payroll.remaining_amount =
                    0;

                payroll.status =
                    'paid';

                payroll.paid_at =
                    new Date();

            } else {

                payroll.status =
                    'pending';

                payroll.paid_at =
                    null;

            }


            await payroll.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    payroll
                }

            });

        }
    );


// =====================================================
// Get Payrolls
// =====================================================

const getPayrolls =
    AsyncWrapper(
        async (
            req,
            res,
            next
        ) => {

            const academy_id =
                getAcademyId(req);

            const filter = {
                academy_id
            };


            // =========================================
            // Billing Month
            // =========================================

            if (
                req.query.billing_month
            ) {

                if (
                    !isValidBillingMonth(
                        req.query.billing_month
                    )
                ) {

                    return next(
                        createError(
                            'billing_month must be in YYYY-MM format',
                            400
                        )
                    );

                }

                filter.billing_month =
                    req.query.billing_month;

            }


            // =========================================
            // Teacher Assignment
            // =========================================

            if (
                req.query.teacher_assignment_id
            ) {

                const teacherAssignment =
                    await getTeacherAssignmentForUser(
                        req,
                        req.query.teacher_assignment_id
                    );


                if (!teacherAssignment) {

                    return next(
                        createError(
                            'teacher assignment not found or you cannot access it',
                            404
                        )
                    );

                }


                filter.teacher_assignment =
                    req.query.teacher_assignment_id;

            }


            // =========================================
            // Status
            // =========================================

            if (
                req.query.status
            ) {

                const allowedStatuses = [
                    'pending',
                    'partially_paid',
                    'paid',
                    'cancelled'
                ];


                if (
                    !allowedStatuses.includes(
                        req.query.status
                    )
                ) {

                    return next(
                        createError(
                            'invalid payroll status',
                            400
                        )
                    );

                }


                filter.status =
                    req.query.status;

            }


            // =========================================
            // Get Payrolls
            // =========================================

            const payrolls =
                await TeacherPayroll.find(
                    filter
                )
                    .populate(
                        'teacher',
                        'user is_active'
                    )
                    .populate({
                        path:
                            'teacher_assignment',

                        populate: {
                            path:
                                'teacher'
                        }
                    })
                    .sort({
                        billing_month: -1,
                        createdAt: -1
                    });


            // =========================================
            // Verify Access
            // =========================================

            const accessiblePayrolls = [];


            for (
                const payroll
                of payrolls
            ) {

                const teacherAssignmentId =
                    payroll.teacher_assignment &&
                    payroll.teacher_assignment._id
                        ?
                        payroll.teacher_assignment._id
                        :
                        payroll.teacher_assignment;


                const accessible =
                    await getTeacherAssignmentForUser(
                        req,
                        teacherAssignmentId
                    );


                if (accessible) {

                    accessiblePayrolls.push(
                        payroll
                    );

                }

            }


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    payrolls:
                        accessiblePayrolls
                }

            });

        }
    );


// =====================================================
// Get Single Payroll
// =====================================================

const getSinglePayroll =
    AsyncWrapper(
        async (
            req,
            res,
            next
        ) => {

            const academy_id =
                getAcademyId(req);


            const payroll =
                await TeacherPayroll.findOne({

                    _id:
                        req.params.payroll_id,

                    academy_id

                })
                    .populate(
                        'teacher',
                        'user is_active'
                    )
                    .populate({
                        path:
                            'teacher_assignment',

                        populate: {
                            path:
                                'teacher'
                        }
                    })
                    .populate({
                        path:
                            'lessons.lesson'
                    });


            if (!payroll) {

                return next(
                    createError(
                        'payroll not found',
                        404
                    )
                );

            }


            // =========================================
            // Access Check
            // =========================================

            const teacherAssignmentId =
                payroll.teacher_assignment &&
                payroll.teacher_assignment._id
                    ?
                    payroll.teacher_assignment._id
                    :
                    payroll.teacher_assignment;


            const teacherAssignment =
                await getTeacherAssignmentForUser(
                    req,
                    teacherAssignmentId
                );


            if (!teacherAssignment) {

                return next(
                    createError(
                        'you cannot access this payroll',
                        403
                    )
                );

            }


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    payroll
                }

            });

        }
    );


// =====================================================
// Pay Payroll
// =====================================================

const payPayroll =
    AsyncWrapper(
        async (
            req,
            res,
            next
        ) => {

            const academy_id =
                getAcademyId(req);


            const {
                amount,
                payment_method,
                reference,
                notes
            } =
                req.body;


            // =========================================
            // Validate Amount
            // =========================================

            if (
                amount === undefined ||
                amount === null
            ) {

                return next(
                    createError(
                        'amount is required',
                        400
                    )
                );

            }


            const paymentAmount =
                Number(amount);


            if (
                !Number.isFinite(
                    paymentAmount
                ) ||
                paymentAmount <= 0
            ) {

                return next(
                    createError(
                        'amount must be greater than 0',
                        400
                    )
                );

            }


            const roundedPaymentAmount =
                roundMoney(
                    paymentAmount
                );


            // =========================================
            // Payment Method
            // =========================================

            const allowedPaymentMethods = [
                'cash',
                'bank_transfer',
                'wallet',
                'card',
                'other'
            ];


            const finalPaymentMethod =
                payment_method ||
                'cash';


            if (
                !allowedPaymentMethods.includes(
                    finalPaymentMethod
                )
            ) {

                return next(
                    createError(
                        'invalid payment_method',
                        400
                    )
                );

            }


            // =========================================
            // Mongo Session
            // =========================================

            const session =
                await mongoose.startSession();


            try {

                session.startTransaction();


                // =====================================
                // Get Payroll
                // =====================================

                const payroll =
                    await TeacherPayroll.findOne({

                        _id:
                            req.params.payroll_id,

                        academy_id

                    }).session(session);


                if (!payroll) {

                    await session.abortTransaction();

                    return next(
                        createError(
                            'payroll not found',
                            404
                        )
                    );

                }


                // =====================================
                // Access
                // =====================================

                const teacherAssignment =
                    await getTeacherAssignmentForUser(
                        req,
                        payroll.teacher_assignment
                    );


                if (!teacherAssignment) {

                    await session.abortTransaction();

                    return next(
                        createError(
                            'you cannot access this payroll',
                            403
                        )
                    );

                }


                // =====================================
                // Cancelled
                // =====================================

                if (
                    payroll.status ===
                    'cancelled'
                ) {

                    await session.abortTransaction();

                    return next(
                        createError(
                            'cannot pay a cancelled payroll',
                            400
                        )
                    );

                }


                // =====================================
                // Already Paid
                // =====================================

                if (
                    payroll.remaining_amount <= 0
                ) {

                    await session.abortTransaction();

                    return next(
                        createError(
                            'payroll is already fully paid',
                            400
                        )
                    );

                }


                // =====================================
                // Cannot Overpay
                // =====================================

                if (
                    roundedPaymentAmount >
                    payroll.remaining_amount
                ) {

                    await session.abortTransaction();

                    return next(
                        createError(
                            'payment amount cannot be greater than remaining amount',
                            400
                        )
                    );

                }


                // =====================================
                // Update Payroll
                // =====================================

                payroll.paid_amount =
                    roundMoney(
                        Number(
                            payroll.paid_amount
                        ) +
                        roundedPaymentAmount
                    );


                payroll.remaining_amount =
                    roundMoney(
                        Number(
                            payroll.total_amount
                        ) -
                        Number(
                            payroll.paid_amount
                        )
                    );


                if (
                    payroll.remaining_amount <= 0
                ) {

                    payroll.remaining_amount =
                        0;

                    payroll.status =
                        'paid';

                    payroll.paid_at =
                        new Date();

                } else {

                    payroll.status =
                        'partially_paid';

                }


                // =====================================
                // Create Expense
                // =====================================

                const expense =
                    await Expense.create(
                        [
                            {
                                academy_id,

                                payroll:
                                    payroll._id,

                                category:
                                    'teacher_salary',

                                title:
                                    `Teacher Salary - ${payroll.billing_month}`,

                                amount:
                                    roundedPaymentAmount,

                                expense_date:
                                    new Date(),

                                payment_method:
                                    finalPaymentMethod,

                                reference,

                                status:
                                    'completed',

                                notes

                            }
                        ],
                        {
                            session
                        }
                    );


                await payroll.save({
                    session
                });


                await session.commitTransaction();


                return res.status(200).json({

                    status:
                        http_status_text.SUCCESS,

                    data: {

                        payroll,

                        expense:
                            expense[0]

                    }

                });

            } catch (error) {

                await session.abortTransaction();

                return next(error);

            } finally {

                await session.endSession();

            }

        }
    );


// =====================================================
// Cancel Payroll
// =====================================================

const cancelPayroll =
    AsyncWrapper(
        async (
            req,
            res,
            next
        ) => {

            const academy_id =
                getAcademyId(req);


            const payroll =
                await TeacherPayroll.findOne({

                    _id:
                        req.params.payroll_id,

                    academy_id

                });


            if (!payroll) {

                return next(
                    createError(
                        'payroll not found',
                        404
                    )
                );

            }


            // =========================================
            // Access
            // =========================================

            const teacherAssignment =
                await getTeacherAssignmentForUser(
                    req,
                    payroll.teacher_assignment
                );


            if (!teacherAssignment) {

                return next(
                    createError(
                        'you cannot access this payroll',
                        403
                    )
                );

            }


            // =========================================
            // Already Cancelled
            // =========================================

            if (
                payroll.status ===
                'cancelled'
            ) {

                return next(
                    createError(
                        'payroll is already cancelled',
                        400
                    )
                );

            }


            // =========================================
            // Cannot Cancel Paid Payroll
            // =========================================

            if (
                payroll.paid_amount > 0
            ) {

                return next(
                    createError(
                        'cannot cancel a payroll that has payments',
                        400
                    )
                );

            }


            payroll.status =
                'cancelled';


            await payroll.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    payroll
                }

            });

        }
    );


// =====================================================
// Module Exports
// =====================================================

module.exports = {

    generatePayroll,

    addDiscount,

    getPayrolls,

    getSinglePayroll,

    payPayroll,

    cancelPayroll

};