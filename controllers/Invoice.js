const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Invoice =
    require('../models/Invoice');

const Family =
    require('../models/Family');

const FamilyDiscount =
    require('../models/FamilyDiscount');

const StudentAssignment =
    require('../models/StudentAssignment');

const StudentSubject =
    require('../models/StudentSubject');

const Lesson =
    require('../models/Lesson');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const {
    isValidBillingMonth,
    getMonthRange
} =
    require('../utils/Billing');

const {
    getAcademyId,
    getStudentAssignmentForUser,
    getStudentSubjectForUser
} = require('../utils/AccessScope');



// =====================================================
// Create Invoice
//
// Creates ONE monthly invoice for the whole family.
//
// Body:
//
// {
//     "family": "FAMILY_ID",
//     "billing_month": "2026-08",
//     "notes": "August 2026 invoice"
// }
//
// The server automatically gets:
//
// Family
//   ↓
// StudentAssignments
//   ↓
// StudentSubjects
//   ↓
// Completed Lessons
//   ↓
// Unbilled Lessons
//   ↓
// Family Discounts
//   ↓
// Invoice
// =====================================================

const createInvoice = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        const {
            family,
            billing_month,
            notes
        } = req.body;


        // =============================================
        // Basic Validation
        // =============================================

        if (
            !family ||
            !billing_month
        ) {

            const error =
                new app_error();

            error.create(
                'family and billing_month are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =============================================
        // Validate Billing Month
        // =============================================

        if (
            !isValidBillingMonth(
                billing_month
            )
        ) {

            const error =
                new app_error();

            error.create(
                'billing_month must be in YYYY-MM format',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =============================================
        // Check Family
        // =============================================

        const familyDoc =
            await Family.findById(
                family
            );


        if (!familyDoc) {

            const error =
                new app_error();

            error.create(
                'family not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            familyDoc.is_active === false
        ) {

            const error =
                new app_error();

            error.create(
                'family is inactive',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =============================================
        // Get Month Range
        // =============================================

        const {
            monthStart,
            nextMonth
        } =
            getMonthRange(
                billing_month
            );


        // =============================================
        // Get All Active Student Assignments
        // For This Family + Academy
        // =============================================

        const studentAssignments =
            await StudentAssignment.find({

                academy_id,

                family,

                is_active:
                    true

            });


        if (
            !studentAssignments.length
        ) {

            const error =
                new app_error();

            error.create(
                'no active students found for this family in this academy',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =============================================
        // Invoice Items
        // =============================================

        const invoiceItems = [];


        let subtotalAmount = 0;


        // =============================================
        // Process Every Student Assignment
        // =============================================

        for (
            const studentAssignment
            of studentAssignments
        ) {

            // =========================================
            // Access Check
            //
            // Academy Admin:
            //   gets the assignment
            //
            // Supervisor:
            //   only gets his own students
            // =========================================

            const accessibleStudent =
                await getStudentAssignmentForUser(
                    req,
                    studentAssignment._id
                );


            if (!accessibleStudent) {

                continue;
            }


            // =========================================
            // Get All Active Subjects
            // For This Student
            // =========================================

            const studentSubjects =
                await StudentSubject.find({

                    academy_id,

                    student_assignment:
                        studentAssignment._id,

                    is_active:
                        true

                });


            // =========================================
            // Process Every Subject
            // =========================================

            for (
                const studentSubject
                of studentSubjects
            ) {

                // =====================================
                // Get Completed Lessons
                // For This Month
                // =====================================

                const lessons =
                    await Lesson.find({

                        academy_id,

                        student_assignment:
                            studentAssignment._id,

                        student_subject:
                            studentSubject._id,

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


                // =====================================
                // Find Previously Invoiced Lessons
                //
                // Only non-cancelled invoices count.
                // =====================================

                const previousInvoices =
                    await Invoice.find({

                        academy_id,

                        family,

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


                // =====================================
                // Already Invoiced Lesson IDs
                // =====================================

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


                // =====================================
                // Keep Only Unbilled Lessons
                // =====================================

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


                // =====================================
                // Calculate Total Minutes
                // =====================================

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


                // =====================================
                // Calculate Billing Hours
                // =====================================

                const billingHours =
                    totalMinutes /
                    60;


                // =====================================
                // Snapshot Price
                // =====================================

                const pricePerLesson =
                    Number(
                        studentSubject.price_per_lesson
                    );


                if (
                    Number.isNaN(
                        pricePerLesson
                    ) ||
                    pricePerLesson < 0
                ) {

                    const error =
                        new app_error();

                    error.create(
                        `invalid price_per_lesson for student subject ${studentSubject._id}`,
                        400,
                        http_status_text.FAIL
                    );

                    return next(error);
                }


                // =====================================
                // Calculate Item Total
                // =====================================

                const itemTotal =
                    Number(
                        (
                            billingHours *
                            pricePerLesson
                        ).toFixed(2)
                    );


                // =====================================
                // Add Invoice Item
                // =====================================

                invoiceItems.push({

                    student_assignment:
                        studentAssignment._id,

                    student_subject:
                        studentSubject._id,

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
                        Number(
                            billingHours.toFixed(4)
                        ),

                    price_per_lesson:
                        pricePerLesson,

                    total:
                        itemTotal

                });


                subtotalAmount +=
                    itemTotal;

            }

        }


        // =============================================
        // No Unbilled Lessons
        // =============================================

        if (
            !invoiceItems.length
        ) {

            const error =
                new app_error();

            error.create(
                'no unbilled completed lessons found for this family in this billing month',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =============================================
        // Round Subtotal
        // =============================================

        subtotalAmount =
            Number(
                subtotalAmount.toFixed(2)
            );


        // =============================================
        // Get Active Family Discounts
        //
        // IMPORTANT:
        // Discounts are NOT accepted from the body.
        // They come directly from the database.
        // =============================================

        const familyDiscounts =
            await FamilyDiscount.find({

                academy_id,

                family,

                billing_month,

                status:
                    'active'

            }).sort({

                createdAt: 1

            });


        // =============================================
        // Calculate Discounts
        //
        // Discounts are applied sequentially.
        //
        // Example:
        //
        // subtotal = 1000
        //
        // 10% => 900
        // 5%  => 855
        //
        // Final = 855
        // =============================================

        let currentAmount =
            subtotalAmount;


        const discountSnapshots = [];


        for (
            const discount
            of familyDiscounts
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

                const error =
                    new app_error();

                error.create(
                    `invalid discount percentage for discount ${discount._id}`,
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


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

                discount:
                    discount._id,

                percentage,

                note:
                    discount.note,

                amount:
                    discountAmount

            });

        }


        // =============================================
        // Final Amount
        // =============================================

        const totalAmount =
            Number(
                currentAmount.toFixed(2)
            );


        // =============================================
        // Total Discount Amount
        // =============================================

        const discountAmount =
            Number(
                (
                    subtotalAmount -
                    totalAmount
                ).toFixed(2)
            );


        // =============================================
        // Effective Discount Percentage
        //
        // Example:
        //
        // 1000 -> 900 -> 855
        //
        // Actual discount = 14.5%
        // =============================================

        const discountPercentage =
            subtotalAmount === 0
                ? 0
                : Number(
                    (
                        (
                            discountAmount /
                            subtotalAmount
                        ) *
                        100
                    ).toFixed(4)
                );


        // =============================================
        // Status
        // =============================================

        const status =
            totalAmount === 0
                ? 'paid'
                : 'unpaid';


        // =============================================
        // Create Invoice
        // =============================================

        const invoice =
            await Invoice.create({

                academy_id,

                family,

                items:
                    invoiceItems,

                subtotal_amount:
                    subtotalAmount,

                discounts:
                    discountSnapshots,

                discount_percentage:
                    discountPercentage,

                discount_amount:
                    discountAmount,

                total_amount:
                    totalAmount,

                paid_amount:
                    0,

                remaining_amount:
                    totalAmount,

                status,

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