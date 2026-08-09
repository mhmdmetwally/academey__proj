const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Invoice =
    require('../models/Invoice');

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
            notes
        } = req.body;


        if (
            !family ||
            !items ||
            !items.length ||
            !billing_month
        ) {

            const error =
                new app_error();

            error.create(
                'family, items and billing_month are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Validate billing month
        // =========================================

        if (
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(
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


        const invoiceItems = [];

        let totalAmount = 0;


        // =================================================
        // Process each student subject
        // =================================================

        for (const item of items) {

            const {
                student_assignment,
                student_subject
            } = item;


            if (
                !student_assignment ||
                !student_subject
            ) {

                const error =
                    new app_error();

                error.create(
                    'student_assignment and student_subject are required',
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
                    student_assignment
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
                    student_subject
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
            // Student Subject belongs to student
            // =========================================

            if (
                String(
                    studentSubject.student_assignment
                ) !==
                String(student_assignment)
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
            // Family Check
            // =========================================

            if (
                String(
                    studentAssignment.family
                ) !==
                String(family)
            ) {

                const error =
                    new app_error();

                error.create(
                    'student does not belong to this family',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Get Completed Lessons
            //
            // Only lessons that:
            //
            // 1. belong to this academy
            // 2. belong to this student
            // 3. belong to this student subject
            // 4. are completed
            // 5. are inside billing month
            //
            // AND have not already been invoiced
            // =========================================

            const [year, month] =
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


            // =========================================
            // Find lessons
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


            if (!lessons.length) {

                continue;
            }


            // =========================================
            // Remove already invoiced lessons
            // =========================================

            const previousInvoices =
                await Invoice.find({

                    academy_id,

                    'items.lessons':
                        {
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
                            String(lessonId)
                        );
                    }
                }
            }


            const uninvoicedLessons =
                lessons.filter(
                    lesson =>
                        !invoicedLessonIds.has(
                            String(lesson._id)
                        )
                );


            if (
                !uninvoicedLessons.length
            ) {

                continue;
            }


            // =========================================
            // Calculate duration
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
            // Convert minutes to hours
            // =========================================

            const billingHours =
                totalMinutes / 60;


            // =========================================
            // Snapshot price
            //
            // price_per_lesson is now:
            // PRICE PER HOUR
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

                const error =
                    new app_error();

                error.create(
                    'invalid student hourly price',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =========================================
            // Calculate item total
            // =========================================

            const itemTotal =
                billingHours *
                pricePerHour;


            // =========================================
            // Add Invoice Item
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
                    billingHours,

                price_per_lesson:
                    pricePerHour,

                total:
                    itemTotal

            });


            totalAmount +=
                itemTotal;
        }


        // =========================================
        // No lessons
        // =========================================

        if (!invoiceItems.length) {

            const error =
                new app_error();

            error.create(
                'no unbilled completed lessons found for this billing month',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Round financial values
        // =========================================

        totalAmount =
            Math.round(
                totalAmount * 100
            ) / 100;


        for (
            const item
            of invoiceItems
        ) {

            item.billing_hours =
                Math.round(
                    item.billing_hours *
                    10000
                ) / 10000;


            item.total =
                Math.round(
                    item.total *
                    100
                ) / 100;
        }


        // =========================================
        // Create Invoice
        // =========================================

        const invoice =
            await Invoice.create({

                academy_id,

                family,

                items:
                    invoiceItems,

                total_amount:
                    totalAmount,

                paid_amount:
                    0,

                remaining_amount:
                    totalAmount,

                status:
                    totalAmount === 0
                        ? 'paid'
                        : 'unpaid',

                billing_month,

                notes

            });


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


        if (req.query.family) {

            filter.family =
                req.query.family;
        }


        if (req.query.billing_month) {

            filter.billing_month =
                req.query.billing_month;
        }


        if (req.query.status) {

            filter.status =
                req.query.status;
        }


        const invoices =
            await Invoice.find(filter)

                .populate(
                    'family',
                    'name phone'
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
                    invoice_date: -1
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
                    'name phone'
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

            const error =
                new app_error();

            error.create(
                'invoice not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
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

            const error =
                new app_error();

            error.create(
                'invoice not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            invoice.status ===
            'cancelled'
        ) {

            const error =
                new app_error();

            error.create(
                'invoice is already cancelled',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            Number(
                invoice.paid_amount
            ) > 0
        ) {

            const error =
                new app_error();

            error.create(
                'cannot cancel an invoice that has payments',
                400,
                http_status_text.FAIL
            );

            return next(error);
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


module.exports = {

    createInvoice,

    getInvoices,

    getSingleInvoice,

    cancelInvoice

};