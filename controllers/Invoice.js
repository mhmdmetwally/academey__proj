const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Invoice =
    require('../models/Invoice');

const Family =
    require('../models/Family');

const StudentSubject =
    require('../models/StudentSubject');

const StudentAssignment =
    require('../models/StudentAssignment');

const Lesson =
    require('../models/Lesson');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const {
    getAcademyId,
    getStudentAssignmentForUser,
    getStudentSubjectForUser
} = require('../utils/AccessScope');


// =====================================================
// Helper: Create Error
// =====================================================

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
// Helper: Validate Billing Month
// =====================================================

const isValidBillingMonth = (
    billing_month
) => {

    return /^\d{4}-(0[1-9]|1[0-2])$/.test(
        billing_month
    );

};


// =====================================================
// Helper: Get Month Range
// =====================================================

const getMonthRange = (
    billing_month
) => {

    const [
        year,
        month
    ] =
        billing_month
            .split('-')
            .map(Number);


    const monthStart =
        new Date(
            year,
            month - 1,
            1,
            0,
            0,
            0,
            0
        );


    const nextMonth =
        new Date(
            year,
            month,
            1,
            0,
            0,
            0,
            0
        );


    return {
        monthStart,
        nextMonth
    };

};


// =====================================================
// Helper: Calculate Discounts
//
// كل خصم نسبة مئوية مستقلة
//
// مثال:
//
// total = 1000
//
// discount 1 = 10%
// discount 2 = 5%
//
// يتم تطبيق الخصومات بالتتابع:
//
// 1000 - 10% = 900
// 900 - 5% = 855
//
// وليس 1000 - 15%
//
// =====================================================

const calculateDiscounts = (
    totalAmount,
    discounts
) => {

    let currentAmount =
        Number(totalAmount);


    const discountSnapshots = [];


    for (
        const discount
        of discounts
    ) {

        const percentage =
            Number(
                discount.percentage
            );


        if (
            Number.isNaN(
                percentage
            ) ||
            percentage <= 0 ||
            percentage > 100
        ) {

            throw createError(
                'discount percentage must be greater than 0 and less than or equal to 100',
                400
            );

        }


        const beforeAmount =
            currentAmount;


        const discountAmount =
            Number(
                (
                    currentAmount *
                    percentage /
                    100
                ).toFixed(2)
            );


        currentAmount =
            Number(
                (
                    currentAmount -
                    discountAmount
                ).toFixed(2)
            );


        discountSnapshots.push({

            percentage,

            amount:
                discountAmount,

            reason:
                discount.reason ||
                null

        });

    }


    return {

        discounts:
            discountSnapshots,

        totalDiscount:
            Number(
                (
                    totalAmount -
                    currentAmount
                ).toFixed(2)
            ),

        finalAmount:
            Number(
                currentAmount.toFixed(2)
            )

    };

};


// =====================================================
// Create Invoice
// =====================================================

const createInvoice = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        const {
            family,
            items,
            billing_month,
            discounts = [],
            notes
        } = req.body;


        // =============================================
        // Basic Validation
        // =============================================

        if (
            !family ||
            !items ||
            !items.length ||
            !billing_month
        ) {

            return next(
                createError(
                    'family, items and billing_month are required',
                    400
                )
            );

        }


        // =============================================
        // Validate Billing Month
        // =============================================

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


        // =============================================
        // Validate Discounts
        // =============================================

        if (
            !Array.isArray(
                discounts
            )
        ) {

            return next(
                createError(
                    'discounts must be an array',
                    400
                )
            );

        }


        // =============================================
        // Check Family
        // =============================================

        const familyDoc =
            await Family.findById(
                family
            );


        if (!familyDoc) {

            return next(
                createError(
                    'family not found',
                    404
                )
            );

        }


        if (
            familyDoc.is_active === false
        ) {

            return next(
                createError(
                    'family is inactive',
                    400
                )
            );

        }


        // =============================================
        // Invoice Items
        // =============================================

        const invoiceItems = [];


        let totalAmount = 0;


        const {
            monthStart,
            nextMonth
        } =
            getMonthRange(
                billing_month
            );


        // =================================================
        // Process Each Student Subject
        // =================================================

        for (
            const item
            of items
        ) {

            const {
                student_assignment,
                student_subject
            } = item;


            // =========================================
            // Validate IDs
            // =========================================

            if (
                !student_assignment ||
                !student_subject
            ) {

                return next(
                    createError(
                        'student_assignment and student_subject are required',
                        400
                    )
                );

            }


            // =========================================
            // Student Access
            // =========================================

            const studentAssignment =
                await getStudentAssignmentForUser(
                    req,
                    student_assignment
                );


            if (!studentAssignment) {

                return next(
                    createError(
                        'you cannot access this student',
                        403
                    )
                );

            }


            // =========================================
            // Student Subject Access
            // =========================================

            const studentSubject =
                await getStudentSubjectForUser(
                    req,
                    student_subject
                );


            if (!studentSubject) {

                return next(
                    createError(
                        'student subject not found or you cannot access it',
                        404
                    )
                );

            }


            // =========================================
            // Student Subject belongs to Student
            // =========================================

            if (
                String(
                    studentSubject.student_assignment
                ) !==
                String(
                    student_assignment
                )
            ) {

                return next(
                    createError(
                        'student subject does not belong to this student',
                        400
                    )
                );

            }


            // =========================================
            // Student belongs to Family
            // =========================================

            if (
                String(
                    studentAssignment.family
                ) !==
                String(
                    family
                )
            ) {

                return next(
                    createError(
                        'student does not belong to this family',
                        400
                    )
                );

            }


            // =========================================
            // Get Completed Lessons
            // =========================================

            const lessons =
                await Lesson.find({

                    academy_id,

                    student_assignment:
                        student_assignment,

                    student_subject:
                        student_subject,

                    status:
                        'completed',

                    lesson_date: {

                        $gte:
                            monthStart,

                        $lt:
                            nextMonth

                    }

                }).sort({

                    lesson_date: 1

                });


            if (
                !lessons.length
            ) {

                continue;

            }


            // =========================================
            // Find Previously Invoiced Lessons
            // =========================================

            const previousInvoices =
                await Invoice.find({

                    academy_id,

                    'items.lessons': {

                        $in:
                            lessons.map(
                                lesson =>
                                    lesson._id
                            )

                    },

                    status: {

                        $ne:
                            'cancelled'

                    }

                }).select(
                    'items.lessons'
                );


            // =========================================
            // Already Invoiced Lesson IDs
            // =========================================

            const invoicedLessonIds =
                new Set();


            for (
                const previousInvoice
                of previousInvoices
            ) {

                for (
                    const invoiceItem
                    of previousInvoice.items
                ) {

                    for (
                        const lessonId
                        of invoiceItem.lessons
                    ) {

                        invoicedLessonIds.add(
                            String(
                                lessonId
                            )
                        );

                    }

                }

            }


            // =========================================
            // Uninvoiced Lessons
            // =========================================

            const uninvoicedLessons =
                lessons.filter(

                    lesson =>

                        !invoicedLessonIds.has(
                            String(
                                lesson._id
                            )
                        )

                );


            if (
                !uninvoicedLessons.length
            ) {

                continue;

            }


            // =========================================
            // Calculate Total Minutes
            // =========================================

            let totalMinutes = 0;


            for (
                const lesson
                of uninvoicedLessons
            ) {

                totalMinutes +=
                    Number(
                        lesson.duration_minutes
                    );

            }


            // =========================================
            // Billing Hours
            // =========================================

            const billingHours =
                totalMinutes /
                60;


            // =========================================
            // Snapshot Hourly Price
            // =========================================

            const pricePerHour =
                Number(
                    studentSubject.price_per_lesson
                );


            if (
                Number.isNaN(
                    pricePerHour
                ) ||
                pricePerHour < 0
            ) {

                return next(
                    createError(
                        'invalid student hourly price',
                        400
                    )
                );

            }


            // =========================================
            // Item Total
            // =========================================

            const itemTotal =
                billingHours *
                pricePerHour;


            // =========================================
            // Add Item
            // =========================================

            invoiceItems.push({

                student_assignment:
                    student_assignment,

                student_subject:
                    student_subject,

                lessons:
                    uninvoicedLessons.map(
                        lesson =>
                            lesson._id
                    ),

                lessons_count:
                    uninvoicedLessons.length,

                total_minutes:
                    totalMinutes,

                billing_hours:
                    Math.round(
                        billingHours *
                        10000
                    ) / 10000,

                price_per_lesson:
                    pricePerHour,

                total:
                    Math.round(
                        itemTotal *
                        100
                    ) / 100

            });


            totalAmount +=
                itemTotal;

        }


        // =============================================
        // No Lessons
        // =============================================

        if (
            !invoiceItems.length
        ) {

            return next(
                createError(
                    'no unbilled completed lessons found for this billing month',
                    400
                )
            );

        }


        // =============================================
        // Round Total
        // =============================================

        totalAmount =
            Number(
                totalAmount.toFixed(2)
            );


        // =============================================
        // Calculate Discounts
        // =============================================

        let discountResult;


        try {

            discountResult =
                calculateDiscounts(
                    totalAmount,
                    discounts
                );

        }
        catch (error) {

            return next(error);

        }


        const totalDiscount =
            discountResult.totalDiscount;


        const finalAmount =
            discountResult.finalAmount;


        // =============================================
        // Create Invoice
        // =============================================

        const invoice =
            await Invoice.create({

                academy_id,

                family,

                items:
                    invoiceItems,

                // قبل الخصم
                total_amount:
                    totalAmount,

                // إجمالي الخصومات
                total_discount:
                    totalDiscount,

                // بعد الخصم
                net_amount:
                    finalAmount,

                // الخصومات Snapshot
                discounts:
                    discountResult.discounts,

                paid_amount:
                    0,

                remaining_amount:
                    finalAmount,

                status:
                    finalAmount === 0
                        ? 'paid'
                        : 'unpaid',

                billing_month,

                notes

            });


        // =============================================
        // Response
        // =============================================

        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {

                invoice

            }

        });

    }

);


// =====================================================
// Get Invoices
// =====================================================

const getInvoices = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        const filter = {

            academy_id

        };


        // =============================================
        // Family Filter
        // =============================================

        if (
            req.query.family
        ) {

            filter.family =
                req.query.family;

        }


        // =============================================
        // Billing Month
        // =============================================

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


        // =============================================
        // Status
        // =============================================

        if (
            req.query.status
        ) {

            filter.status =
                req.query.status;

        }


        // =============================================
        // Get Invoices
        // =============================================

        const invoices =
            await Invoice.find(
                filter
            )

                .populate(
                    'family',
                    'name phone is_active'
                )

                .populate(
                    'items.student_assignment'
                )

                .populate(
                    'items.student_subject'
                )

                .populate(
                    'items.lessons'
                )

                .sort({

                    invoice_date:
                        -1

                });


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                invoices

            }

        });

    }

);


// =====================================================
// Get Single Invoice
// =====================================================

const getSingleInvoice = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        const invoice =
            await Invoice.findOne({

                _id:
                    req.params.invoice_id,

                academy_id

            })

                .populate(
                    'family',
                    'name phone is_active'
                )

                .populate(
                    'items.student_assignment'
                )

                .populate(
                    'items.student_subject'
                )

                .populate(
                    'items.lessons'
                );


        if (!invoice) {

            return next(
                createError(
                    'invoice not found',
                    404
                )
            );

        }


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                invoice

            }

        });

    }

);


// =====================================================
// Cancel Invoice
// =====================================================

const cancelInvoice = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        const invoice =
            await Invoice.findOne({

                _id:
                    req.params.invoice_id,

                academy_id

            });


        if (!invoice) {

            return next(
                createError(
                    'invoice not found',
                    404
                )
            );

        }


        if (
            invoice.status ===
            'cancelled'
        ) {

            return next(
                createError(
                    'invoice is already cancelled',
                    400
                )
            );

        }


        // =============================================
        // Cannot Cancel Paid Invoice
        // =============================================

        if (
            Number(
                invoice.paid_amount
            ) > 0
        ) {

            return next(
                createError(
                    'cannot cancel an invoice that has payments',
                    400
                )
            );

        }


        invoice.status =
            'cancelled';


        invoice.remaining_amount =
            0;


        await invoice.save();


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                invoice

            }

        });

    }

);


// =====================================================
// Exports
// =====================================================

module.exports = {

    createInvoice,

    getInvoices,

    getSingleInvoice,

    cancelInvoice

};