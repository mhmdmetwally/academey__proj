const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Invoice =
    require('../models/Invoice');

const Lesson =
    require('../models/Lesson');

const StudentSubject =
    require('../models/StudentSubject');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const {
    getAcademyId,
    getStudentAssignmentForUser
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


        // =================================================
        // Validate billing month
        // =================================================

        if (
            !/^\d{4}-(0[1-9]|1[0-2])$/
                .test(billing_month)
        ) {

            const error =
                new app_error();

            error.create(
                'billing_month must be YYYY-MM',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        const invoiceItems = [];

        let totalAmount = 0;


        // =================================================
        // Process Items
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


            // =============================================
            // Student Access
            // =============================================

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


            // =============================================
            // Family Check
            // =============================================

            if (
                String(studentAssignment.family)
                !==
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


            // =============================================
            // Student Subject
            // =============================================

            const studentSubject =
                await StudentSubject.findOne({

                    _id:
                        student_subject,

                    student_assignment:
                        student_assignment,

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


            const price =
                Number(
                    studentSubject.price_per_lesson
                );


            if (
                Number.isNaN(price) ||
                price < 0
            ) {

                const error =
                    new app_error();

                error.create(
                    'invalid student lesson price',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =============================================
            // Month Range
            // =============================================

            const startDate =
                new Date(
                    `${billing_month}-01T00:00:00.000Z`
                );


            const endDate =
                new Date(startDate);

            endDate.setUTCMonth(
                endDate.getUTCMonth() + 1
            );


            // =============================================
            // Find Completed Lessons
            // =============================================

            const lessons =
                await Lesson.find({

                    academy_id,

                    student_assignment:
                        student_assignment,

                    student:
                        studentAssignment.student,

                    student_subject:
                        student_subject,

                    status:
                        'completed',

                    lesson_date: {
                        $gte: startDate,
                        $lt: endDate
                    }

                })
                .sort({
                    lesson_date: 1
                });


            if (!lessons.length) {

                const error =
                    new app_error();

                error.create(
                    `no completed lessons found for ${billing_month}`,
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =============================================
            // Check Already Invoiced Lessons
            // =============================================

            const lessonIds =
                lessons.map(
                    lesson => lesson._id
                );


            const previousInvoice =
                await Invoice.findOne({

                    academy_id,

                    'items.lessons': {
                        $in: lessonIds
                    },

                    status: {
                        $ne: 'cancelled'
                    }

                });


            if (previousInvoice) {

                const error =
                    new app_error();

                error.create(
                    'some lessons are already included in another invoice',
                    409,
                    http_status_text.FAIL
                );

                return next(error);
            }


            // =============================================
            // Calculate
            // =============================================

            const lessonsCount =
                lessons.length;


            const itemTotal =
                lessonsCount * price;


            invoiceItems.push({

                student_assignment:
                    student_assignment,

                student_subject:
                    student_subject,

                lessons:
                    lessonIds,

                lessons_count:
                    lessonsCount,

                price_per_lesson:
                    price,

                total:
                    itemTotal

            });


            totalAmount +=
                itemTotal;
        }


        // =================================================
        // Create Invoice
        // =================================================

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
            invoice.paid_amount > 0
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


        invoice.status =
            'cancelled';


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