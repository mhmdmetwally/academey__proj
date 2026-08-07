const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Invoice =
    require('../models/Invoice');

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


        const invoiceItems = [];

        let totalAmount = 0;


        for (const item of items) {

            const {
                student_assignment,
                student_subject,
                lessons_count
            } = item;


            if (
                !student_assignment ||
                !student_subject ||
                lessons_count === undefined
            ) {

                const error =
                    new app_error();

                error.create(
                    'invalid invoice item',
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
            // Family Check
            // =========================================

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


            // =========================================
            // Student Subject
            // =========================================

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


            const count =
                Number(lessons_count);


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


            if (
                !Number.isInteger(count) ||
                count < 0
            ) {

                const error =
                    new app_error();

                error.create(
                    'lessons_count must be a non-negative integer',
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            const itemTotal =
                count * price;


            invoiceItems.push({

                student_assignment:
                    student_assignment,

                student_subject:
                    student_subject,

                lessons_count:
                    count,

                price_per_lesson:
                    price,

                total:
                    itemTotal

            });


            totalAmount +=
                itemTotal;
        }


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