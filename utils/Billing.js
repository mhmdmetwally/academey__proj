const app_error =
    require('../utils/AppError');

const http_status_text =
    require('../utils/HttpStatusText');


// =====================================================
// Create Error
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
// Validate Billing Month
// =====================================================

const isValidBillingMonth = (
    billing_month
) => {

    return /^\d{4}-(0[1-9]|1[0-2])$/.test(
        billing_month
    );

};


// =====================================================
// Get Month Range
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
// Calculate Discounts
//
// الخصومات تطبق بالتتابع
//
// مثال:
//
// 1000
// 10%  -> 900
// 5%   -> 855
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
                discount.discount || null,

            percentage,

            amount:
                discountAmount,

            note:
                discount.note ||
                null

        });

    }


    return {

        discounts:
            discountSnapshots,

        totalDiscount:
            Number(
                (
                    Number(totalAmount) -
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
// Exports
// =====================================================

module.exports = {

    isValidBillingMonth,

    getMonthRange,

    calculateDiscounts

};