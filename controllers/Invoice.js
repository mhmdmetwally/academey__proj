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
    getStudentAssignmentForUser
} =
    require('../utils/AccessScope');


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
// Helper: Round
// =====================================================

const roundMoney = (value) => {

    return Number(
        Number(value).toFixed(2)
    );

};


// =====================================================
// Helper: Get Monthly Invoice Totals
//
// Gets all non-cancelled invoices for:
// academy + family + billing_month
// =====================================================

const getMonthlyInvoiceTotals = async (
    academy_id,
    family,
    billing_month
) => {

    const result =
        await Invoice.aggregate([

            {
                $match: {

                    academy_id,

                    family,

                    billing_month,

                    status: {
                        $ne: 'cancelled'
                    }

                }
            },

            {
                $group: {

                    _id: null,

                    subtotal_amount: {
                        $sum: '$subtotal_amount'
                    },

                    discount_amount: {
                        $sum: '$discount_amount'
                    },

                    total_amount: {
                        $sum: '$total_amount'
                    },

                    paid_amount: {
                        $sum: '$paid_amount'
                    },

                    remaining_amount: {
                        $sum: '$remaining_amount'
                    },

                    invoice_count: {
                        $sum: 1
                    }

                }
            }

        ]);


    if (!result.length) {

        return {

            subtotal_amount: 0,

            discount_amount: 0,

            total_amount: 0,

            paid_amount: 0,

            remaining_amount: 0,

            invoice_count: 0

        };

    }


    return {

        subtotal_amount:
            roundMoney(
                result[0].subtotal_amount
            ),

        discount_amount:
            roundMoney(
                result[0].discount_amount
            ),

        total_amount:
            roundMoney(
                result[0].total_amount
            ),

        paid_amount:
            roundMoney(
                result[0].paid_amount
            ),

        remaining_amount:
            roundMoney(
                result[0].remaining_amount
            ),

        invoice_count:
            result[0].invoice_count

    };

};


// =====================================================
// Helper: Calculate Monthly Discount
//
// IMPORTANT
//
// Family discounts belong to the MONTH,
// not to each invoice separately.
//
// Example:
//
// Existing invoices subtotal = 1000
// New invoice subtotal = 500
//
// Discounts:
// 10%
// 5%
//
// We calculate the discount on the monthly
// cumulative amount and only put the NEW
// portion of the discount into the new invoice.
//
// This prevents:
//
// Invoice 1 -> 10% discount
// Invoice 2 -> another full 10% discount
//
// =====================================================

const calculateIncrementalDiscount = (
    oldSubtotal,
    newSubtotal,
    discounts
) => {

    let oldAmount =
        roundMoney(oldSubtotal);

    let newAmount =
        roundMoney(
            oldSubtotal +
            newSubtotal
        );


    const snapshots = [];


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
                `invalid discount percentage for discount ${discount._id}`,
                400
            );

        }


        // =============================================
        // Amount before discount
        // =============================================

        const oldBefore =
            oldAmount;

        const newBefore =
            newAmount;


        // =============================================
        // Apply discount to OLD monthly amount
        // =============================================

        const oldDiscountAmount =
            roundMoney(
                oldBefore *
                percentage /
                100
            );


        oldAmount =
            roundMoney(
                oldBefore -
                oldDiscountAmount
            );


        // =============================================
        // Apply discount to NEW monthly amount
        // =============================================

        const newDiscountAmount =
            roundMoney(
                newBefore *
                percentage /
                100
            );


        newAmount =
            roundMoney(
                newBefore -
                newDiscountAmount
            );


        // =============================================
        // Only the NEW portion belongs to
        // the current invoice
        // =============================================

        const incrementalDiscount =
            roundMoney(
                (
                    oldBefore -
                    oldAmount
                ) ===
                (
                    newBefore -
                    newAmount
                )
                    ? 0
                    : 0
            );


        /*
         * The clean way is to compare the
         * discount generated by the cumulative
         * amount against the discount generated
         * by the old amount.
         */

        const oldFinalAfterThisDiscount =
            oldAmount;

        const cumulativeFinalAfterThisDiscount =
            newAmount;


        /*
         * We don't use the above direct difference
         * because previous discounts may already
         * have changed the base.
         *
         * Calculate the new invoice's share:
         */

        const newPortion =
            roundMoney(
                (
                    newBefore -
                    oldBefore
                )
            );


        const newDiscountShare =
            roundMoney(
                newPortion *
                percentage /
                100
            );


        snapshots.push({

            discount:
                discount._id,

            percentage,

            note:
                discount.note,

            amount:
                newDiscountShare

        });

    }


    /*
     * Recalculate exact final amount for the
     * current invoice:
     *
     * cumulative final
     * minus old monthly final
     */

    let oldFinal =
        roundMoney(oldSubtotal);

    let cumulativeFinal =
        roundMoney(
            oldSubtotal +
            newSubtotal
        );


    for (
        const discount
        of discounts
    ) {

        const percentage =
            Number(
                discount.percentage
            );


        oldFinal =
            roundMoney(
                oldFinal -
                roundMoney(
                    oldFinal *
                    percentage /
                    100
                )
            );


        cumulativeFinal =
            roundMoney(
                cumulativeFinal -
                roundMoney(
                    cumulativeFinal *
                    percentage /
                    100
                )
            );

    }


    const newInvoiceFinal =
        roundMoney(
            cumulativeFinal -
            oldFinal
        );


    const actualDiscount =
        roundMoney(
            newSubtotal -
            newInvoiceFinal
        );


    /*
     * Rebuild snapshots correctly.
     *
     * Each discount's incremental amount is
     * calculated stage by stage.
     */

    snapshots.length = 0;


    let oldStage =
        roundMoney(oldSubtotal);

    let cumulativeStage =
        roundMoney(
            oldSubtotal +
            newSubtotal
        );


    for (
        const discount
        of discounts
    ) {

        const percentage =
            Number(
                discount.percentage
            );


        const oldStageAfter =
            roundMoney(
                oldStage -
                roundMoney(
                    oldStage *
                    percentage /
                    100
                )
            );


        const cumulativeStageAfter =
            roundMoney(
                cumulativeStage -
                roundMoney(
                    cumulativeStage *
                    percentage /
                    100
                )
            );


        const oldDiscount =
            roundMoney(
                oldStage -
                oldStageAfter
            );


        const cumulativeDiscount =
            roundMoney(
                cumulativeStage -
                cumulativeStageAfter
            );


        const incrementalAmount =
            roundMoney(
                cumulativeDiscount -
                oldDiscount
            );


        snapshots.push({

            discount:
                discount._id,

            percentage,

            note:
                discount.note,

            amount:
                incrementalAmount

        });


        oldStage =
            oldStageAfter;

        cumulativeStage =
            cumulativeStageAfter;

    }


    return {

        discounts:
            snapshots,

        discountAmount:
            actualDiscount,

        totalAmount:
            newInvoiceFinal

    };

};


// =====================================================
// Create Invoice
//
// Body:
//
// {
//     "family": "FAMILY_ID",
//     "billing_month": "2026-08",
//     "notes": "August invoice"
// }
//
// Server automatically gets:
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
// Invoice
//
// Can create MULTIPLE invoices for same family/month.
// =====================================================

const createInvoice =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);


            const {
                family,
                billing_month,
                notes
            } =
                req.body;


            // =============================================
            // Validation
            // =============================================

            if (
                !family ||
                !billing_month
            ) {

                return next(
                    createError(
                        'family and billing_month are required',
                        400
                    )
                );

            }


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
            // Family
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
            // Month
            // =============================================

            const {
                monthStart,
                nextMonth
            } =
                getMonthRange(
                    billing_month
                );


            // =============================================
            // Get all active students
            // =============================================

            const studentAssignments =
                await StudentAssignment.find({

                    academy_id,

                    family,

                    is_active: true

                });


            if (
                !studentAssignments.length
            ) {

                return next(
                    createError(
                        'no active students found for this family in this academy',
                        400
                    )
                );

            }


            // =============================================
            // Invoice Items
            // =============================================

            const invoiceItems = [];


            let subtotalAmount = 0;


            // =============================================
            // Loop Students
            // =============================================

            for (
                const studentAssignment
                of studentAssignments
            ) {

                // =========================================
                // Access Scope
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
                // Get Subjects
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
                // Loop Subjects
                // =========================================

                for (
                    const studentSubject
                    of studentSubjects
                ) {

                    // =====================================
                    // Lessons
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

                            lesson_date:
                                1

                        });


                    if (!lessons.length) {
                        continue;
                    }


                    // =====================================
                    // Find already invoiced lessons
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
                    // Only unbilled lessons
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
                    // Total Minutes
                    // =====================================

                    let totalMinutes = 0;


                    for (
                        const lesson
                        of uninvoicedLessons
                    ) {

                        totalMinutes +=
                            Number(
                                lesson.duration_minutes || 0
                            );

                    }


                    // =====================================
                    // Billing Hours
                    // =====================================

                    const billingHours =
                        totalMinutes / 60;


                    // =====================================
                    // Price
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

                        return next(
                            createError(
                                `invalid price_per_lesson for student subject ${studentSubject._id}`,
                                400
                            )
                        );

                    }


                    // =====================================
                    // Item Total
                    // =====================================

                    const itemTotal =
                        roundMoney(
                            billingHours *
                            pricePerLesson
                        );


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
            // No new lessons
            // =============================================

            if (
                !invoiceItems.length
            ) {

                return next(
                    createError(
                        'no unbilled completed lessons found for this family in this billing month',
                        400
                    )
                );

            }


            subtotalAmount =
                roundMoney(
                    subtotalAmount
                );


            // =============================================
            // Existing monthly invoices
            // =============================================

            const previousMonthlyTotals =
                await getMonthlyInvoiceTotals(
                    academy_id,
                    family,
                    billing_month
                );


            // =============================================
            // Get Active Discounts
            // =============================================

            const familyDiscounts =
                await FamilyDiscount.find({

                    academy_id,

                    family,

                    billing_month,

                    status:
                        'active'

                }).sort({

                    createdAt:
                        1

                });


            // =============================================
            // Calculate only NEW invoice's
            // share of monthly discounts
            // =============================================

            const discountResult =
                calculateIncrementalDiscount(

                    previousMonthlyTotals.subtotal_amount,

                    subtotalAmount,

                    familyDiscounts

                );


            const totalAmount =
                roundMoney(
                    discountResult.totalAmount
                );


            const discountAmount =
                roundMoney(
                    discountResult.discountAmount
                );


            const discountPercentage =
                subtotalAmount === 0

                    ? 0

                    : Number(
                        (
                            discountAmount /
                            subtotalAmount *
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
                        discountResult.discounts,

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
            // Get New Monthly Summary
            // =============================================

            const monthlyTotals =
                await getMonthlyInvoiceTotals(
                    academy_id,
                    family,
                    billing_month
                );


            return res.status(201).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    invoice,

                    monthly_summary:
                        monthlyTotals

                }

            });

        }

    );


// =====================================================
// Get Invoices
//
// Returns invoices + totals for returned filters
// =====================================================

const getInvoices =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);


            const filter = {

                academy_id

            };


            // =============================================
            // Family
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
            // Invoices
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


            // =============================================
            // Calculate totals
            // =============================================

            const totals =
                invoices.reduce(

                    (acc, invoice) => {

                        if (
                            invoice.status !==
                            'cancelled'
                        ) {

                            acc.subtotal_amount +=
                                Number(
                                    invoice.subtotal_amount
                                );

                            acc.discount_amount +=
                                Number(
                                    invoice.discount_amount
                                );

                            acc.total_amount +=
                                Number(
                                    invoice.total_amount
                                );

                            acc.paid_amount +=
                                Number(
                                    invoice.paid_amount
                                );

                            acc.remaining_amount +=
                                Number(
                                    invoice.remaining_amount
                                );

                            acc.invoice_count++;

                        }


                        return acc;

                    },

                    {

                        subtotal_amount: 0,

                        discount_amount: 0,

                        total_amount: 0,

                        paid_amount: 0,

                        remaining_amount: 0,

                        invoice_count: 0

                    }

                );


            totals.subtotal_amount =
                roundMoney(
                    totals.subtotal_amount
                );

            totals.discount_amount =
                roundMoney(
                    totals.discount_amount
                );

            totals.total_amount =
                roundMoney(
                    totals.total_amount
                );

            totals.paid_amount =
                roundMoney(
                    totals.paid_amount
                );

            totals.remaining_amount =
                roundMoney(
                    totals.remaining_amount
                );


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    invoices,

                    totals

                }

            });

        }

    );


// =====================================================
// Get Monthly Family Summary
//
// GET:
// /invoice/monthly-summary?family=XXX&billing_month=2026-08
// =====================================================

const getMonthlyFamilySummary =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);


            const {
                family,
                billing_month
            } =
                req.query;


            if (
                !family ||
                !billing_month
            ) {

                return next(
                    createError(
                        'family and billing_month are required',
                        400
                    )
                );

            }


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


            const familyDoc =
                await Family.findOne({

                    _id:
                        family

                });


            if (!familyDoc) {

                return next(
                    createError(
                        'family not found',
                        404
                    )
                );

            }


            const invoices =
                await Invoice.find({

                    academy_id,

                    family,

                    billing_month

                })

                    .sort({

                        invoice_date:
                            1

                    });


            const totals =
                await getMonthlyInvoiceTotals(
                    academy_id,
                    family,
                    billing_month
                );


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    family: {

                        _id:
                            familyDoc._id,

                        name:
                            familyDoc.name,

                        phone:
                            familyDoc.phone

                    },

                    billing_month,

                    invoices,

                    totals

                }

            });

        }

    );


// =====================================================
// Get Single Invoice
// =====================================================

const getSingleInvoice =
    AsyncWrapper(

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


            // =============================================
            // Monthly Summary
            // =============================================

            const monthlyTotals =
                await getMonthlyInvoiceTotals(

                    academy_id,

                    invoice.family._id ||
                    invoice.family,

                    invoice.billing_month

                );


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    invoice,

                    monthly_summary:
                        monthlyTotals

                }

            });

        }

    );


// =====================================================
// Cancel Invoice
// =====================================================

const cancelInvoice =
    AsyncWrapper(

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
            // Cannot cancel if paid
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


            const monthlyTotals =
                await getMonthlyInvoiceTotals(

                    academy_id,

                    invoice.family,

                    invoice.billing_month

                );


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    invoice,

                    monthly_summary:
                        monthlyTotals

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

    getMonthlyFamilySummary,

    getSingleInvoice,

    cancelInvoice

};