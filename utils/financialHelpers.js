const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const TeacherPayroll = require('../models/TeacherPayroll');

// =====================================================
// Calculate Growth Percentage
// =====================================================
const calculateGrowth = (currentAmount, previousAmount) => {
    if (previousAmount === 0) {
        return currentAmount > 0 ? 100 : 0;
    }
    const growth = ((currentAmount - previousAmount) / previousAmount) * 100;
    return Number(growth.toFixed(2));
};

// =====================================================
// Get and Validate Report Period Dates
// =====================================================
const getReportPeriod = (queryParams) => {
    const { startDate, endDate } = queryParams;

    if (!startDate || !endDate) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { error: 'Invalid date format' };
    }

    return { start, end };
};

// =====================================================
// Get Previous Period Dates
// =====================================================
const getPreviousPeriod = (start, end) => {
    const duration = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);

    return {
        start: previousStart,
        end: previousEnd
    };
};

// =====================================================
// Fetch Financial Aggregation Data from MongoDB
// =====================================================
const getFinancialData = async (academyId, start, end) => {
    const academyObjectId = new mongoose.Types.ObjectId(academyId);
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startBillingMonth = startDate.toISOString().slice(0, 7);
    const endBillingMonth = endDate.toISOString().slice(0, 7);

    // 1. Total Revenue Aggregation
    const revenueAgg = await Payment.aggregate([
        {
            $match: {
                academy_id: academyObjectId,
                status: 'completed',
                payment_date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amount' },
                count: { $sum: 1 },
                invoicedPaidAmount: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'invoice_payment'] }, '$amount', 0]
                    }
                }
            }
        }
    ]);

    // 2. Total Expenses & Categories Aggregation
    const expensesAgg = await Expense.aggregate([
        {
            $match: {
                academy_id: academyObjectId,
                status: 'completed',
                expense_date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $facet: {
                total: [
                    {
                        $group: {
                            _id: null,
                            totalExpenses: { $sum: '$amount' },
                            count: { $sum: 1 }
                        }
                    }
                ],
                byCategory: [
                    {
                        $group: {
                            _id: '$category',
                            amount: { $sum: '$amount' },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            category: '$_id',
                            amount: 1,
                            count: 1
                        }
                    }
                ]
            }
        }
    ]);

    // 3. Teacher Payroll Aggregation
    const payrollAgg = await TeacherPayroll.aggregate([
        {
            $match: {
                academy_id: academyObjectId,
                billing_month: { $gte: startBillingMonth, $lte: endBillingMonth }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$total_amount' },
                paid: { $sum: '$paid_amount' },
                remaining: { $sum: '$remaining_amount' },
                pending: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                partially_paid: {
                    $sum: { $cond: [{ $eq: ['$status', 'partially_paid'] }, 1, 0] }
                },
                paid_payrolls: {
                    $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
                },
                cancelled: {
                    $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                },
                count: { $sum: 1 }
            }
        }
    ]);

    const revenue = revenueAgg[0]?.totalRevenue || 0;
    const paymentCount = revenueAgg[0]?.count || 0;

    const totalExpenseData = expensesAgg[0]?.total[0];
    const expenses = totalExpenseData?.totalExpenses || 0;
    const expenseCount = totalExpenseData?.count || 0;
    const expensesByCategory = expensesAgg[0]?.byCategory || [];

    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : '0.00';

    const payrollData = payrollAgg[0] || {};
    const teacherPayroll = {
        total: payrollData.total || 0,
        paid: payrollData.paid || 0,
        remaining: payrollData.remaining || 0,
        pending: payrollData.pending || 0,
        partially_paid: payrollData.partially_paid || 0,
        paid_payrolls: payrollData.paid_payrolls || 0,
        cancelled: payrollData.cancelled || 0,
        count: payrollData.count || 0
    };

    return {
        revenue,
        expenses,
        net_profit: netProfit,
        profit_margin: profitMargin,
        payment_count: paymentCount,
        expense_count: expenseCount,
        invoice_count: 0,
        invoiced_amount: 0,
        invoiced_paid_amount: revenueAgg[0]?.invoicedPaidAmount || 0,
        invoiced_remaining_amount: 0,
        teacher_payroll: teacherPayroll,
        expenses_by_category: expensesByCategory
    };
};

module.exports = {
    getReportPeriod,
    getPreviousPeriod,
    getFinancialData,
    calculateGrowth
};