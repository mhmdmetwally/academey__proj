const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const FamilyDiscount =
    require('../models/FamilyDiscount');

const Family =
    require('../models/Family');

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
// Helper
// =====================================================

const createError =
    (message, statusCode) => {

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
// Validate Month
// =====================================================

const validateMonth =
    (billing_month) => {

        return /^\d{4}-(0[1-9]|1[0-2])$/
            .test(billing_month);

    };


// =====================================================
// Get Total Active Discount Percentage
// =====================================================

const getTotalDiscountPercentage =
    async (
        academy_id,
        family,
        billing_month
    ) => {

        const discounts =
            await FamilyDiscount.find({

                academy_id,

                family,

                billing_month,

                status: 'active'

            });

        let total = 0;

        for (
            const discount
            of discounts
        ) {

            total +=
                Number(
                    discount.percentage
                );

        }

        return total;
    };


// =====================================================
// Create Discount
// =====================================================

const createDiscount =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);

            const {
                family,
                billing_month,
                percentage,
                note
            } = req.body;


            if (
                !family ||
                !billing_month ||
                percentage === undefined ||
                !note
            ) {

                return next(
                    createError(
                        'family, billing_month, percentage and note are required',
                        400
                    )
                );

            }


            // =========================================
            // Validate Month
            // =========================================

            if (
                !validateMonth(
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
            // Validate Percentage
            // =========================================

            const discountPercentage =
                Number(
                    percentage
                );


            if (
                Number.isNaN(
                    discountPercentage
                ) ||
                discountPercentage <= 0 ||
                discountPercentage > 100
            ) {

                return next(
                    createError(
                        'percentage must be greater than 0 and less than or equal to 100',
                        400
                    )
                );

            }


            // =========================================
            // Family Exists
            // =========================================

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


            // =========================================
            // Check Existing Invoice
            //
            // Important:
            // Once invoice is created,
            // changing monthly discount can
            // cause confusion.
            //
            // So we don't allow adding discount
            // after invoice exists.
            // =========================================

            const existingInvoice =
                await Invoice.findOne({

                    academy_id,

                    family,

                    billing_month,

                    status: {
                        $ne: 'cancelled'
                    }

                });


            if (existingInvoice) {

                return next(
                    createError(
                        'cannot add discount after invoice has been created for this month',
                        400
                    )
                );

            }


            // =========================================
            // Check Total Percentage
            // =========================================

            const currentTotal =
                await getTotalDiscountPercentage(
                    academy_id,
                    family,
                    billing_month
                );


            const newTotal =
                currentTotal +
                discountPercentage;


            if (
                newTotal > 100
            ) {

                return next(
                    createError(
                        `total discounts cannot exceed 100%. Current total is ${currentTotal}%`,
                        400
                    )
                );

            }


            // =========================================
            // Create Discount
            // =========================================

            const discount =
                await FamilyDiscount.create({

                    academy_id,

                    family,

                    billing_month,

                    percentage:
                        discountPercentage,

                    note

                });


            return res.status(201).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    discount
                }

            });

        }
    );


// =====================================================
// Get Discounts
// =====================================================

const getDiscounts =
    AsyncWrapper(

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
                req.query.billing_month
            ) {

                filter.billing_month =
                    req.query.billing_month;

            }


            if (
                req.query.status
            ) {

                filter.status =
                    req.query.status;

            }


            const discounts =
                await FamilyDiscount.find(
                    filter
                )

                    .populate(
                        'family',
                        'name phone'
                    )

                    .sort({
                        createdAt: -1
                    });


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    discounts
                }

            });

        }
    );


// =====================================================
// Get Single Discount
// =====================================================

const getSingleDiscount =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);


            const discount =
                await FamilyDiscount.findOne({

                    _id:
                        req.params.discount_id,

                    academy_id

                })

                    .populate(
                        'family',
                        'name phone'
                    );


            if (!discount) {

                return next(
                    createError(
                        'discount not found',
                        404
                    )
                );

            }


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    discount
                }

            });

        }
    );


// =====================================================
// Update Discount
// =====================================================

const updateDiscount =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);


            const discount =
                await FamilyDiscount.findOne({

                    _id:
                        req.params.discount_id,

                    academy_id

                });


            if (!discount) {

                return next(
                    createError(
                        'discount not found',
                        404
                    )
                );

            }


            if (
                discount.status ===
                'cancelled'
            ) {

                return next(
                    createError(
                        'cannot update a cancelled discount',
                        400
                    )
                );

            }


            // =========================================
            // Don't modify after invoice
            // =========================================

            const existingInvoice =
                await Invoice.findOne({

                    academy_id,

                    family:
                        discount.family,

                    billing_month:
                        discount.billing_month,

                    status: {
                        $ne: 'cancelled'
                    }

                });


            if (existingInvoice) {

                return next(
                    createError(
                        'cannot update discount after invoice has been created for this month',
                        400
                    )
                );

            }


            // =========================================
            // Percentage
            // =========================================

            if (
                req.body.percentage !==
                undefined
            ) {

                const percentage =
                    Number(
                        req.body.percentage
                    );


                if (
                    Number.isNaN(
                        percentage
                    ) ||
                    percentage <= 0 ||
                    percentage > 100
                ) {

                    return next(
                        createError(
                            'percentage must be greater than 0 and less than or equal to 100',
                            400
                        )
                    );

                }


                const otherDiscounts =
                    await FamilyDiscount.find({

                        academy_id,

                        family:
                            discount.family,

                        billing_month:
                            discount.billing_month,

                        status: 'active',

                        _id: {
                            $ne:
                                discount._id
                        }

                    });


                let total =
                    percentage;


                for (
                    const item
                    of otherDiscounts
                ) {

                    total +=
                        Number(
                            item.percentage
                        );

                }


                if (
                    total > 100
                ) {

                    return next(
                        createError(
                            `total discounts cannot exceed 100%. Result would be ${total}%`,
                            400
                        )
                    );

                }


                discount.percentage =
                    percentage;

            }


            if (
                req.body.note !==
                undefined
            ) {

                if (
                    !String(
                        req.body.note
                    ).trim()
                ) {

                    return next(
                        createError(
                            'note is required',
                            400
                        )
                    );

                }


                discount.note =
                    req.body.note;

            }


            await discount.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    discount
                }

            });

        }
    );


// =====================================================
// Cancel Discount
// =====================================================

const cancelDiscount =
    AsyncWrapper(

        async (req, res, next) => {

            const academy_id =
                getAcademyId(req);


            const discount =
                await FamilyDiscount.findOne({

                    _id:
                        req.params.discount_id,

                    academy_id

                });


            if (!discount) {

                return next(
                    createError(
                        'discount not found',
                        404
                    )
                );

            }


            if (
                discount.status ===
                'cancelled'
            ) {

                return next(
                    createError(
                        'discount is already cancelled',
                        400
                    )
                );

            }


            // =========================================
            // If invoice already exists
            // don't modify historical invoice
            // =========================================

            const existingInvoice =
                await Invoice.findOne({

                    academy_id,

                    family:
                        discount.family,

                    billing_month:
                        discount.billing_month,

                    status: {
                        $ne: 'cancelled'
                    }

                });


            if (existingInvoice) {

                return next(
                    createError(
                        'cannot cancel discount after invoice has been created for this month',
                        400
                    )
                );

            }


            discount.status =
                'cancelled';


            await discount.save();


            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {
                    discount
                }

            });

        }
    );


module.exports = {

    createDiscount,

    getDiscounts,

    getSingleDiscount,

    updateDiscount,

    cancelDiscount

};