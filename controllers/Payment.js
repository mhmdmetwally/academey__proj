const mongoose = require('mongoose');

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
// Helper: Update Invoice Payment Status
// =====================================================

const updateInvoiceStatus = (invoice) => {

    if (
        invoice.status === 'cancelled'
    ) {
        return;
    }


    // Prevent floating point problems
    invoice.paid_amount =
        Math.max(
            0,
            Number(
                invoice.paid_amount.toFixed(2)
            )
        );


    invoice.remaining_amount =
        Math.max(
            0,
            Number(
                (
                    invoice.total_amount -
                    invoice.paid_amount
                ).toFixed(2)
            )
        );


    if (
        invoice.remaining_amount === 0
    ) {

        invoice.status =
            'paid';

    }
    else if (
        invoice.paid_amount > 0
    ) {

        invoice.status =
            'partially_paid';

    }
    else {

        invoice.status =
            'unpaid';

    }
};


// =====================================================
// Create Payment
// =====================================================

const createPayment = AsyncWrapper(
    async (req, res, next) => {

        const session =
            await mongoose.startSession();


        try {

            await session.withTransaction(
                async () => {

                    const academy_id =
                        getAcademyId(req);


                    const {
                        family,
                        invoice,
                        amount,
                        type,
                        method,
                        payment_date,
                        reference,
                        notes
                    } = req.body;


                    // =============================================
                    // Basic Validation
                    // =============================================

                    if (!family) {

                        throw createError(
                            'family is required',
                            400
                        );

                    }


                    if (
                        amount === undefined ||
                        amount === null
                    ) {

                        throw createError(
                            'amount is required',
                            400
                        );

                    }


                    const paymentAmount =
                        Number(amount);


                    if (
                        Number.isNaN(paymentAmount) ||
                        paymentAmount <= 0
                    ) {

                        throw createError(
                            'amount must be greater than 0',
                            400
                        );

                    }


                    if (
                        !type
                    ) {

                        throw createError(
                            'type is required',
                            400
                        );

                    }


                    if (
                        ![
                            'invoice_payment',
                            'advance'
                        ].includes(type)
                    ) {

                        throw createError(
                            'invalid payment type',
                            400
                        );

                    }


                    // =============================================
                    // Invoice Payment
                    // =============================================

                    if (
                        type ===
                        'invoice_payment'
                    ) {

                        if (!invoice) {

                            throw createError(
                                'invoice is required for invoice_payment',
                                400
                            );

                        }


                        // =========================================
                        // Get Invoice
                        // =========================================

                        const invoiceDoc =
                            await Invoice.findOne({

                                _id:
                                    invoice,

                                academy_id,

                                family

                            }).session(session);


                        if (!invoiceDoc) {

                            throw createError(
                                'invoice not found',
                                404
                            );

                        }


                        // =========================================
                        // Cancelled Invoice
                        // =========================================

                        if (
                            invoiceDoc.status ===
                            'cancelled'
                        ) {

                            throw createError(
                                'cannot pay a cancelled invoice',
                                400
                            );

                        }


                        // =========================================
                        // Check Remaining
                        // =========================================

                        const remaining =
                            Number(
                                invoiceDoc.remaining_amount
                            );


                        if (
                            paymentAmount >
                            remaining
                        ) {

                            throw createError(
                                `payment amount cannot exceed invoice remaining amount (${remaining})`,
                                400
                            );

                        }


                        // =========================================
                        // Create Payment
                        // =========================================

                        const payment =
                            new Payment({

                                academy_id,

                                family,

                                invoice,

                                amount:
                                    paymentAmount,

                                remaining_amount:
                                    0,

                                type:
                                    'invoice_payment',

                                method:
                                    method || 'cash',

                                payment_date:
                                    payment_date ||
                                    Date.now(),

                                reference,

                                notes

                            });


                        await payment.save({
                            session
                        });


                        // =========================================
                        // Create Allocation
                        // =========================================

                        const allocation =
                            new PaymentAllocation({

                                payment:
                                    payment._id,

                                invoice:
                                    invoiceDoc._id,

                                amount:
                                    paymentAmount

                            });


                        await allocation.save({
                            session
                        });


                        // =========================================
                        // Update Invoice
                        // =========================================

                        invoiceDoc.paid_amount =
                            Number(
                                invoiceDoc.paid_amount
                            ) +
                            paymentAmount;


                        updateInvoiceStatus(
                            invoiceDoc
                        );


                        await invoiceDoc.save({
                            session
                        });


                        req.paymentResult = {
                            payment,
                            allocation,
                            invoice: invoiceDoc
                        };

                    }


                    // =============================================
                    // Advance Payment
                    // =============================================

                    else {

                        if (invoice) {

                            throw createError(
                                'advance payment cannot have an invoice',
                                400
                            );

                        }


                        // =========================================
                        // Create Advance Payment
                        // =========================================

                        const payment =
                            new Payment({

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

                                method:
                                    method || 'cash',

                                payment_date:
                                    payment_date ||
                                    Date.now(),

                                reference,

                                notes

                            });


                        await payment.save({
                            session
                        });


                        req.paymentResult = {
                            payment
                        };

                    }

                }
            );


            return res.status(201).json({

                status:
                    http_status_text.SUCCESS,

                data:
                    req.paymentResult

            });

        }
        finally {

            await session.endSession();

        }

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
            academy_id
        };


        if (
            req.query.family
        ) {

            filter.family =
                req.query.family;

        }


        if (
            req.query.invoice
        ) {

            filter.invoice =
                req.query.invoice;

        }


        if (
            req.query.type
        ) {

            filter.type =
                req.query.type;

        }


        if (
            req.query.status
        ) {

            filter.status =
                req.query.status;

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

const getSinglePayment = AsyncWrapper(
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
                createError(
                    'payment not found',
                    404
                );

            return next(error);

        }


        const allocations =
            await PaymentAllocation.find({

                payment:
                    payment._id

            })

            .populate(
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


// =====================================================
// Get Invoice Payments
// =====================================================

const getInvoicePayments = AsyncWrapper(
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
                createError(
                    'invoice not found',
                    404
                );

            return next(error);

        }


        const allocations =
            await PaymentAllocation.find({

                invoice:
                    invoice._id

            })

            .populate({
                path:
                    'payment',

                populate: {
                    path:
                        'family',

                    select:
                        'name phone'
                }
            })

            .sort({
                createdAt: -1
            });


        return res.status(200).json({

            status:
                http_status_text.SUCCESS,

            data: {

                invoice,

                allocations

            }

        });

    }
);


// =====================================================
// Allocate Advance Payment
// =====================================================

const allocateAdvancePayment =
    AsyncWrapper(
        async (req, res, next) => {

            const session =
                await mongoose.startSession();


            try {

                await session.withTransaction(
                    async () => {

                        const academy_id =
                            getAcademyId(req);


                        const {
                            invoice,
                            amount
                        } = req.body;


                        if (!invoice) {

                            throw createError(
                                'invoice is required',
                                400
                            );

                        }


                        if (
                            amount === undefined ||
                            amount === null
                        ) {

                            throw createError(
                                'amount is required',
                                400
                            );

                        }


                        const allocationAmount =
                            Number(amount);


                        if (
                            Number.isNaN(
                                allocationAmount
                            ) ||
                            allocationAmount <= 0
                        ) {

                            throw createError(
                                'amount must be greater than 0',
                                400
                            );

                        }


                        // =========================================
                        // Get Payment
                        // =========================================

                        const payment =
                            await Payment.findOne({

                                _id:
                                    req.params.payment_id,

                                academy_id,

                                type:
                                    'advance',

                                status:
                                    'completed'

                            }).session(session);


                        if (!payment) {

                            throw createError(
                                'advance payment not found',
                                404
                            );

                        }


                        // =========================================
                        // Check Payment Balance
                        // =========================================

                        if (
                            allocationAmount >
                            payment.remaining_amount
                        ) {

                            throw createError(
                                'allocation amount exceeds payment remaining amount',
                                400
                            );

                        }


                        // =========================================
                        // Get Invoice
                        // =========================================

                        const invoiceDoc =
                            await Invoice.findOne({

                                _id:
                                    invoice,

                                academy_id,

                                family:
                                    payment.family

                            }).session(session);


                        if (!invoiceDoc) {

                            throw createError(
                                'invoice not found or does not belong to this family',
                                404
                            );

                        }


                        if (
                            invoiceDoc.status ===
                            'cancelled'
                        ) {

                            throw createError(
                                'cannot allocate payment to a cancelled invoice',
                                400
                            );

                        }


                        // =========================================
                        // Check Invoice Balance
                        // =========================================

                        if (
                            allocationAmount >
                            invoiceDoc.remaining_amount
                        ) {

                            throw createError(
                                'allocation amount exceeds invoice remaining amount',
                                400
                            );

                        }


                        // =========================================
                        // Existing Allocation
                        // =========================================

                        let allocation =
                            await PaymentAllocation.findOne({

                                payment:
                                    payment._id,

                                invoice:
                                    invoiceDoc._id

                            }).session(session);


                        if (allocation) {

                            allocation.amount =
                                Number(
                                    allocation.amount
                                ) +
                                allocationAmount;


                        }
                        else {

                            allocation =
                                new PaymentAllocation({

                                    payment:
                                        payment._id,

                                    invoice:
                                        invoiceDoc._id,

                                    amount:
                                        allocationAmount

                                });

                        }


                        await allocation.save({
                            session
                        });


                        // =========================================
                        // Update Payment
                        // =========================================

                        payment.remaining_amount =
                            Number(
                                (
                                    payment.remaining_amount -
                                    allocationAmount
                                ).toFixed(2)
                            );


                        await payment.save({
                            session
                        });


                        // =========================================
                        // Update Invoice
                        // =========================================

                        invoiceDoc.paid_amount =
                            Number(
                                invoiceDoc.paid_amount
                            ) +
                            allocationAmount;


                        updateInvoiceStatus(
                            invoiceDoc
                        );


                        await invoiceDoc.save({
                            session
                        });


                        req.paymentResult = {

                            payment,

                            allocation,

                            invoice:
                                invoiceDoc

                        };

                    }
                );


                return res.status(200).json({

                    status:
                        http_status_text.SUCCESS,

                    data:
                        req.paymentResult

                });

            }
            finally {

                await session.endSession();

            }

        }
    );


// =====================================================
// Cancel Payment
// =====================================================

const cancelPayment = AsyncWrapper(
    async (req, res, next) => {

        const session =
            await mongoose.startSession();


        try {

            await session.withTransaction(
                async () => {

                    const academy_id =
                        getAcademyId(req);


                    const payment =
                        await Payment.findOne({

                            _id:
                                req.params.payment_id,

                            academy_id

                        }).session(session);


                    if (!payment) {

                        throw createError(
                            'payment not found',
                            404
                        );

                    }


                    if (
                        payment.status ===
                        'cancelled'
                    ) {

                        throw createError(
                            'payment is already cancelled',
                            400
                        );

                    }


                    // =========================================
                    // Get Allocations
                    // =========================================

                    const allocations =
                        await PaymentAllocation.find({

                            payment:
                                payment._id

                        }).session(session);


                    // =========================================
                    // Reverse Invoice Payments
                    // =========================================

                    for (
                        const allocation
                        of allocations
                    ) {

                        const invoice =
                            await Invoice.findOne({

                                _id:
                                    allocation.invoice,

                                academy_id

                            }).session(session);


                        if (!invoice) {

                            throw createError(
                                'invoice related to payment was not found',
                                404
                            );

                        }


                        invoice.paid_amount =
                            Math.max(
                                0,
                                Number(
                                    invoice.paid_amount
                                ) -
                                Number(
                                    allocation.amount
                                )
                            );


                        updateInvoiceStatus(
                            invoice
                        );


                        await invoice.save({
                            session
                        });

                    }


                    // =========================================
                    // Delete Allocations
                    // =========================================

                    await PaymentAllocation.deleteMany({

                        payment:
                            payment._id

                    }).session(session);


                    // =========================================
                    // Cancel Payment
                    // =========================================

                    payment.status =
                        'cancelled';


                    /*
                    The full amount becomes unallocated
                    after cancellation.

                    We keep the original amount for
                    historical records.
                    */

                    payment.remaining_amount =
                        0;


                    await payment.save({
                        session
                    });


                    req.paymentResult = {
                        payment
                    };

                }
            );


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data:
                    req.paymentResult

            });

        }
        finally {

            await session.endSession();

        }

    }
);


module.exports = {

    createPayment,

    getPayments,

    getSinglePayment,

    getInvoicePayments,

    allocateAdvancePayment,

    cancelPayment

};