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
// Exports
// =====================================================

module.exports = {

    isValidBillingMonth,

    getMonthRange

};