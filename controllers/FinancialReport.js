const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Payment =
    require('../models/Payment');

const Expense =
    require('../models/Expense');

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
// Helpers
// =====================================================

function getStartOfDay(date) {

    const result =
        new Date(date);

    result.setUTCHours(
        0,
        0,
        0,
        0
    );

    return result;
}


function getEndOfDay(date) {

    const result =
        new Date(date);

    result.setUTCHours(
        23,
        59,
        59,
        999
    );

    return result;
}


// =====================================================
// Get Report Period
// =====================================================

function getReportPeriod(
    query
) {

    // =============================================
    // Month
    // =============================================

    if (query.month) {

        if (
            !/^\d{4}-(0[1-9]|1[0-2])$/
                .test(query.month)
        ) {

            return {
                error:
                    'month must be in YYYY-MM format'
            };

        }


        const start =
            new Date(
                `${query.month}-01T00:00:00.000Z`
            );


        const end =
            new Date(start);


        end.setUTCMonth(
            end.getUTCMonth() + 1
        );


        end.setUTCMilliseconds(
            end.getUTCMilliseconds() - 1
        );


        return {
            start,
            end
        };

    }


    // =============================================
    // Year
    // =============================================

    if (query.year) {

        if (
            !/^\d{4}$/
                .test(query.year)
        ) {

            return {
                error:
                    'year must be in YYYY format'
            };

        }


        const year =
            Number(query.year);


        const start =
            new Date(
                `${year}-01-01T00:00:00.000Z`
            );


        const end =
            new Date(
                `${year + 1}-01-01T00:00:00.000Z`
            );


        end.setUTCMilliseconds(
            end.getUTCMilliseconds() - 1
        );


        return {
            start,
            end
        };

    }


    // =============================================
    // Custom Range
    // =============================================

    if (
        query.from ||
        query.to
    ) {

        if (
            !query.from ||
            !query.to
        ) {

            return {
                error:
                    'from and to are both required'
            };

        }


        const start =
            getStartOfDay(
                new Date(
                    `${query.from}T00:00:00.000Z`
                )
            );


        const end =
            getEndOfDay(
                new Date(
                    `${query.to}T00:00:00.000Z`
                )
            );


        if (
            Number.isNaN(
                start.getTime()
            ) ||
            Number.isNaN(
                end.getTime()
            )
        ) {

            return {
                error:
                    'invalid from or to date'
            };

        }


        if (
            start > end
        ) {

            return {
                error:
                    'from date must be before or equal to to date'
            };

        }


        return {
            start,
            end
        };

    }


    // =============================================
    // Default = Current Month
    // =============================================

    const now =
        new Date();


    const start =
        new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                1
            )
        );


    const end =
        new Date(start);


    end.setUTCMonth(
        end.getUTCMonth() + 1
    );


    end.setUTCMilliseconds(
        end.getUTCMilliseconds() - 1
    );


    return {
        start,
        end
    };
}


// =====================================================
// Get Previous Period
// =====================================================

function getPreviousPeriod(
    start,
    end
) {

    const duration =
        end.getTime()
        -
        start.getTime();


    const previousEnd =
        new Date(
            start.getTime() - 1
        );


    const previousStart =
        new Date(
            previousEnd.getTime()
            -
            duration
        );


    return {
        start:
            previousStart,

        end:
            previousEnd
    };
}


// =====================================================
// Growth Calculation
// =====================================================

function calculateGrowth(
    current,
    previous
) {

    current =
        Number(current) || 0;

    previous =
        Number(previous) || 0;


    // No previous data
    if (
        previous === 0
    ) {

        if (
            current === 0
        ) {

            return 0;

        }

        return null;
    }


    return Number(
        (
            (
                current -
                previous
            )
            /
            previous
        )
        *
        100
    ).toFixed(2);
}


// =====================================================
// Get Financial Data
// =====================================================

async function getFinancialData(
    academy_id,
    start,
    end
) {

    // =============================================
    // Payments
    // =============================================

    const paymentResult =
        await Payment.aggregate([

            {
                $match: {

                    academy_id,

                    status:
                        'completed',

                    payment_date: {

                        $gte:
                            start,

                        $lte:
                            end

                    }

                }

            },

            {
                $group: {

                    _id:
                        null,

                    total:
                        {
                            $sum:
                                '$amount'
                        },

                    count:
                        {
                            $sum:
                                1
                        }

                }

            }

        ]);


    const totalRevenue =
        paymentResult.length
            ? paymentResult[0].total
            : 0;


    const paymentCount =
        paymentResult.length
            ? paymentResult[0].count
            : 0;


    // =============================================
    // Expenses
    // =============================================

    const expenseResult =
        await Expense.aggregate([

            {
                $match: {

                    academy_id,

                    status:
                        'completed',

                    expense_date: {

                        $gte:
                            start,

                        $lte:
                            end

                    }

                }

            },

            {
                $group: {

                    _id:
                        null,

                    total:
                        {
                            $sum:
                                '$amount'
                        },

                    count:
                        {
                            $sum:
                                1
                        }

                }

            }

        ]);


    const totalExpenses =
        expenseResult.length
            ? expenseResult[0].total
            : 0;


    const expenseCount =
        expenseResult.length
            ? expenseResult[0].count
            : 0;


    // =============================================
    // Expenses By Category
    // =============================================

    const expensesByCategory =
        await Expense.aggregate([

            {
                $match: {

                    academy_id,

                    status:
                        'completed',

                    expense_date: {

                        $gte:
                            start,

                        $lte:
                            end

                    }

                }

            },

            {
                $group: {

                    _id:
                        '$category',

                    amount:
                        {
                            $sum:
                                '$amount'
                        },

                    count:
                        {
                            $sum:
                                1
                        }

                }

            },

            {
                $sort: {

                    amount:
                        -1

                }

            }

        ]);


    // =============================================
    // Invoices
    // =============================================

    const invoiceResult =
        await Invoice.aggregate([

            {
                $match: {

                    academy_id,

                    invoice_date: {

                        $gte:
                            start,

                        $lte:
                            end

                    },

                    status: {

                        $ne:
                            'cancelled'

                    }

                }

            },

            {
                $group: {

                    _id:
                        null,

                    total:
                        {
                            $sum:
                                '$total_amount'
                        },

                    paid:
                        {
                            $sum:
                                '$paid_amount'
                        },

                    remaining:
                        {
                            $sum:
                                '$remaining_amount'
                        },

                    count:
                        {
                            $sum:
                                1
                        }

                }

            }

        ]);


    const invoiceData =
        invoiceResult.length
            ? invoiceResult[0]
            : {

                total:
                    0,

                paid:
                    0,

                remaining:
                    0,

                count:
                    0

            };


    // =============================================
    // Net Profit
    // =============================================

    const netProfit =
        totalRevenue -
        totalExpenses;


    // =============================================
    // Profit Margin
    // =============================================

    let profitMargin =
        0;


    if (
        totalRevenue > 0
    ) {

        profitMargin =
            (
                netProfit /
                totalRevenue
            )
            *
            100;

    }


    return {

        revenue:
            Number(
                totalRevenue
            ),

        expenses:
            Number(
                totalExpenses
            ),

        net_profit:
            Number(
                netProfit
            ),

        profit_margin:
            Number(
                profitMargin
            ).toFixed(2),

        payment_count:
            paymentCount,

        expense_count:
            expenseCount,

        invoice_count:
            invoiceData.count,

        invoiced_amount:
            Number(
                invoiceData.total
            ),

        invoiced_paid_amount:
            Number(
                invoiceData.paid
            ),

        invoiced_remaining_amount:
            Number(
                invoiceData.remaining
            ),

        expenses_by_category:
            expensesByCategory.map(
                item => ({

                    category:
                        item._id,

                    amount:
                        Number(
                            item.amount
                        ),

                    count:
                        item.count

                })
            )

    };
}


// =====================================================
// Financial Report
// =====================================================

const getFinancialReport =
    AsyncWrapper(

        async (
            req,
            res,
            next
        ) => {

            const academy_id =
                getAcademyId(req);


            // =========================================
            // Period
            // =========================================

            const period =
                getReportPeriod(
                    req.query
                );


            if (
                period.error
            ) {

                const error =
                    new app_error();

                error.create(
                    period.error,
                    400,
                    http_status_text.FAIL
                );

                return next(error);
            }


            const {
                start,
                end
            } =
                period;


            // =========================================
            // Previous Period
            // =========================================

            const previousPeriod =
                getPreviousPeriod(
                    start,
                    end
                );


            // =========================================
            // Current Data
            // =========================================

            const current =
                await getFinancialData(

                    academy_id,

                    start,

                    end

                );


            // =========================================
            // Previous Data
            // =========================================

            const previous =
                await getFinancialData(

                    academy_id,

                    previousPeriod.start,

                    previousPeriod.end

                );


            // =========================================
            // Growth
            // =========================================

            const revenueGrowth =
                calculateGrowth(

                    current.revenue,

                    previous.revenue

                );


            const expenseGrowth =
                calculateGrowth(

                    current.expenses,

                    previous.expenses

                );


            const profitGrowth =
                calculateGrowth(

                    current.net_profit,

                    previous.net_profit

                );


            // =========================================
            // Response
            // =========================================

            return res.status(200).json({

                status:
                    http_status_text.SUCCESS,

                data: {

                    period: {

                        from:
                            start,

                        to:
                            end

                    },

                    previous_period: {

                        from:
                            previousPeriod.start,

                        to:
                            previousPeriod.end

                    },

                    current: {

                        revenue:
                            current.revenue,

                        expenses:
                            current.expenses,

                        net_profit:
                            current.net_profit,

                        profit_margin:
                            current.profit_margin,

                        payment_count:
                            current.payment_count,

                        expense_count:
                            current.expense_count,

                        invoice_count:
                            current.invoice_count,

                        invoiced_amount:
                            current.invoiced_amount,

                        invoiced_paid_amount:
                            current.invoiced_paid_amount,

                        invoiced_remaining_amount:
                            current.invoiced_remaining_amount,

                        expenses_by_category:
                            current.expenses_by_category

                    },

                    previous: {

                        revenue:
                            previous.revenue,

                        expenses:
                            previous.expenses,

                        net_profit:
                            previous.net_profit

                    },

                    growth: {

                        revenue:
                            revenueGrowth,

                        expenses:
                            expenseGrowth,

                        net_profit:
                            profitGrowth

                    }

                }

            });

        }

    );


module.exports = {

    getFinancialReport

};