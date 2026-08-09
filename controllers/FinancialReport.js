const AsyncWrapper =
    require('../middleware/AsyncWrapper');

const Payment =
    require('../models/Payment');

const Expense =
    require('../models/Expense');

const Invoice =
    require('../models/Invoice');

const TeacherPayroll =
    require('../models/TeacherPayroll');

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
// Get YYYY-MM
// =====================================================

function getBillingMonthFromDate(
    date
) {

    return `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
    ).padStart(2, '0')}`;

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
        end.getTime() -
        start.getTime();

    const previousEnd =
        new Date(
            start.getTime() - 1
        );

    const previousStart =
        new Date(
            previousEnd.getTime() -
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
    // Teacher Payroll
    //
    // IMPORTANT:
    // We DO NOT use createdAt.
    //
    // We use billing_month.
    // =============================================

    const fromMonth =
        getBillingMonthFromDate(
            start
        );

    const toMonth =
        getBillingMonthFromDate(
            end
        );

    const payrollResult =
        await TeacherPayroll.aggregate([

            {
                $match: {

                    academy_id,

                    billing_month: {

                        $gte:
                            fromMonth,

                        $lte:
                            toMonth

                    }

                }

            },

            {
                $group: {

                    _id:
                        null,

                    // =================================
                    // إجمالي الرواتب المستحقة
                    // بدون cancelled
                    // =================================

                    total:
                        {
                            $sum:
                                {
                                    $cond: [
                                        {
                                            $ne: [
                                                '$status',
                                                'cancelled'
                                            ]
                                        },
                                        '$total_amount',
                                        0
                                    ]
                                }
                        },

                    // =================================
                    // المبلغ المدفوع فعليًا
                    // =================================

                    paid:
                        {
                            $sum:
                                {
                                    $cond: [
                                        {
                                            $ne: [
                                                '$status',
                                                'cancelled'
                                            ]
                                        },
                                        '$paid_amount',
                                        0
                                    ]
                                }
                        },

                    // =================================
                    // المتبقي
                    // =================================

                    remaining:
                        {
                            $sum:
                                {
                                    $cond: [
                                        {
                                            $ne: [
                                                '$status',
                                                'cancelled'
                                            ]
                                        },
                                        '$remaining_amount',
                                        0
                                    ]
                                }
                        },

                    // =================================
                    // Pending
                    // =================================

                    pending:
                        {
                            $sum:
                                {
                                    $cond: [
                                        {
                                            $eq: [
                                                '$status',
                                                'pending'
                                            ]
                                        },
                                        '$total_amount',
                                        0
                                    ]
                                }
                        },

                    // =================================
                    // Partially Paid
                    // =================================

                    partially_paid:
                        {
                            $sum:
                                {
                                    $cond: [
                                        {
                                            $eq: [
                                                '$status',
                                                'partially_paid'
                                            ]
                                        },
                                        '$remaining_amount',
                                        0
                                    ]
                                }
                        },

                    // =================================
                    // Paid Payrolls
                    // =================================

                    paid_payrolls:
                        {
                            $sum:
                                {
                                    $cond: [
                                        {
                                            $eq: [
                                                '$status',
                                                'paid'
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                        },

                    // =================================
                    // Cancelled
                    // =================================

                    cancelled:
                        {
                            $sum:
                                {
                                    $cond: [
                                        {
                                            $eq: [
                                                '$status',
                                                'cancelled'
                                            ]
                                        },
                                        '$total_amount',
                                        0
                                    ]
                                }
                        },

                    count:
                        {
                            $sum:
                                1
                        }

                }

            }

        ]);

    const payrollData =
        payrollResult.length
            ? payrollResult[0]
            : {

                total:
                    0,

                paid:
                    0,

                remaining:
                    0,

                pending:
                    0,

                partially_paid:
                    0,

                paid_payrolls:
                    0,

                cancelled:
                    0,

                count:
                    0

            };

    // =============================================
    // Net Cash Profit
    //
    // Revenue = actual customer payments
    // Expenses = actual paid expenses
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

        teacher_payroll: {

            total:
                Number(
                    payrollData.total
                ),

            paid:
                Number(
                    payrollData.paid
                ),

            remaining:
                Number(
                    payrollData.remaining
                ),

            pending:
                Number(
                    payrollData.pending
                ),

            partially_paid:
                Number(
                    payrollData.partially_paid
                ),

            paid_payrolls:
                payrollData.paid_payrolls,

            cancelled:
                Number(
                    payrollData.cancelled
                ),

            count:
                payrollData.count

        },

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

                        teacher_payroll:
                            current.teacher_payroll,

                        expenses_by_category:
                            current.expenses_by_category

                    },

                    previous: {

                        revenue:
                            previous.revenue,

                        expenses:
                            previous.expenses,

                        net_profit:
                            previous.net_profit,

                        teacher_payroll:
                            previous.teacher_payroll

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

// =====================================================
// Export
// =====================================================

module.exports = {

    getFinancialReport

};