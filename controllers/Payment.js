const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Payment =
    require('../models/Payment');

const PaymentAllocation =
    require('../models/PaymentAllocation');

const Invoice =
    require('../models/Invoice');

const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');

const {
    getAcademyId
} = require('../utils/AccessScope');


// =====================================================
// Update Invoice Payment
// =====================================================

const updateInvoicePayment =
    async (invoice_id) => {

        const invoice =
            await Invoice.findById(
                invoice_id
            );


        if (!invoice) {
            return;
        }


        const allocations =
            await PaymentAllocation.find({

                invoice:
                    invoice._id

            });


        let paidAmount = 0;


        for (
            const allocation
            of allocations
        ) {

            paidAmount +=
                allocation.amount;

        }


        invoice.paid_amount =
            paidAmount;


        invoice.remaining_amount =
            Math.max(

                invoice.total_amount -
                paidAmount,

                0

            );


        if (
            invoice.status !==
            'cancelled'
        ) {

            if (
                invoice.remaining_amount === 0
            ) {

                invoice.status =
                    'paid';

            } else if (
                invoice.paid_amount > 0
            ) {

                invoice.status =
                    'partially_paid';

            } else {

                invoice.status =
                    'unpaid';

            }

        }


        await invoice.save();
    };


// =====================================================
// Create Payment
// =====================================================

const createPayment = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        const {
            family,
            invoice,
            amount,
            method,
            payment_date,
            reference,
            notes
        } = req.body;


        const paymentAmount =
            Number(amount);


        if (
            !family ||
            amount === undefined
        ) {

            const error =
                new app_error();

            error.create(
                'family and amount are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            Number.isNaN(paymentAmount) ||
            paymentAmount <= 0
        ) {

            const error =
                new app_error();

            error.create(
                'amount must be greater than zero',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =================================================
        // Advance Payment
        // =================================================

        if (!invoice) {

            const payment =
                await Payment.create({

                    academy_id,

                    family,

                    invoice:
                        null,

                    amount:
                        paymentAmount,

                    remaining_amount:
                        paymentAmount,

                    type:
                        'advance',

                    method,

                    payment_date,

                    reference,

                    notes

                });


            return res.status(201).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    payment
                }

            });
        }


        // =================================================
        // Invoice Payment
        // =================================================

        const currentInvoice =
            await Invoice.findOne({

                _id:
                    invoice,

                academy_id,

                family

            });


        if (!currentInvoice) {

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
            currentInvoice.status ===
            'cancelled'
        ) {

            const error =
                new app_error();

            error.create(
                'cannot pay a cancelled invoice',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            currentInvoice.remaining_amount === 0
        ) {

            const error =
                new app_error();

            error.create(
                'invoice is already fully paid',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            paymentAmount >
            currentInvoice.remaining_amount
        ) {

            const error =
                new app_error();

            error.create(
                `payment amount is greater than invoice remaining amount (${currentInvoice.remaining_amount})`,
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        const payment =
            await Payment.create({

                academy_id,

                family,

                invoice:
                    currentInvoice._id,

                amount:
                    paymentAmount,

                remaining_amount:
                    0,

                type:
                    'invoice_payment',

                method,

                payment_date,

                reference,

                notes

            });


        await PaymentAllocation.create({

            payment:
                payment._id,

            invoice:
                currentInvoice._id,

            amount:
                paymentAmount

        });


        await updateInvoicePayment(
            currentInvoice._id
        );


        const updatedInvoice =
            await Invoice.findById(
                currentInvoice._id
            );


        return res.status(201).json({

            status:
                http_status_text.SUCCESS,

            data: {

                payment,

                invoice:
                    updatedInvoice

            }

        });

    }
);


// =====================================================
// Allocate Advance Payment
// =====================================================

const allocateAdvancePayment = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);

        const payment_id =
            req.params.payment_id;

        const {
            invoice,
            amount
        } = req.body;


        const allocationAmount =
            Number(amount);


        if (
            !invoice ||
            amount === undefined
        ) {

            const error =
                new app_error();

            error.create(
                'invoice and amount are required',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            Number.isNaN(allocationAmount) ||
            allocationAmount <= 0
        ) {

            const error =
                new app_error();

            error.create(
                'amount must be greater than zero',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Find Advance
        // =========================================

        const payment =
            await Payment.findOne({

                _id:
                    payment_id,

                academy_id,

                type:
                    'advance',

                status:
                    'completed'

            });


        if (!payment) {

            const error =
                new app_error();

            error.create(
                'advance payment not found',
                404,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Check Remaining Advance
        // =========================================

        if (
            allocationAmount >
            payment.remaining_amount
        ) {

            const error =
                new app_error();

            error.create(
                `allocation amount is greater than remaining advance (${payment.remaining_amount})`,
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Find Invoice
        // =========================================

        const currentInvoice =
            await Invoice.findOne({

                _id:
                    invoice,

                academy_id,

                family:
                    payment.family

            });


        if (!currentInvoice) {

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
            currentInvoice.status ===
            'cancelled'
        ) {

            const error =
                new app_error();

            error.create(
                'cannot allocate payment to cancelled invoice',
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        if (
            allocationAmount >
            currentInvoice.remaining_amount
        ) {

            const error =
                new app_error();

            error.create(
                `allocation amount is greater than invoice remaining amount (${currentInvoice.remaining_amount})`,
                400,
                http_status_text.FAIL
            );

            return next(error);
        }


        // =========================================
        // Create Allocation
        // =========================================

        await PaymentAllocation.create({

            payment:
                payment._id,

            invoice:
                currentInvoice._id,

            amount:
                allocationAmount

        });


        // =========================================
        // Update Advance
        // =========================================

        payment.remaining_amount =
            payment.remaining_amount -
            allocationAmount;


        await payment.save();


        // =========================================
        // Update Invoice
        // =========================================

        await updateInvoicePayment(
            currentInvoice._id
        );


        const updatedInvoice =
            await Invoice.findById(
                currentInvoice._id
            );


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                payment,

                invoice:
                    updatedInvoice

            }

        });

    }
);


// =====================================================
// Get Payments
// =====================================================

const getPayments = AsyncWrapper(

    async (req, res, next) => {

        const academy_id =
            getAcademyId(req);


        const filter = {

            academy_id,

            status:
                'completed'

        };


        if (req.query.family) {

            filter.family =
                req.query.family;

        }


        if (req.query.invoice) {

            filter.invoice =
                req.query.invoice;

        }


        if (req.query.type) {

            filter.type =
                req.query.type;

        }


        const payments =
            await Payment.find(filter)

                .populate(
                    'family',
                    'name phone'
                )

                .populate(
                    'invoice'
                )

                .sort({
                    payment_date: -1
                });


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {
                payments
            }

        });

    }
);


// =====================================================
// Get Single Payment
// =====================================================

const getSinglePayment =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);


            const payment =
                await Payment.findOne({

                    _id:
                        req.params.payment_id,

                    academy_id

                })

                .populate(
                    'family',
                    'name phone'
                )

                .populate(
                    'invoice'
                );


            if (!payment) {

                const error =
                    new app_error();

                error.create(
                    'payment not found',
                    404,
                    http_status_text.FAIL
                );

                return next(error);
            }


            const allocations =
                await PaymentAllocation.find({

                    payment:
                        payment._id

                }).populate(
                    'invoice'
                );


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    payment,

                    allocations

                }

            });

        }

    );


module.exports = {

    createPayment,

    allocateAdvancePayment,

    getPayments,

    getSinglePayment

};
