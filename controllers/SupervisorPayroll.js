const AsyncWrapper = require('../middleware/AsyncWrapper');
const SupervisorPayroll = require('../models/SupervisorPayroll');
const Expense = require('../models/Expense');
const Supervisor = require('../models/Supervisor');
const User = require('../models/User');
const app_error = require('../utils/AppError');
const http_status_text = require('../utils/HttpStatusText');
const { getAcademyId } = require('../utils/AccessScope');

// =====================================================
// 1. إنشاء / حساب مرتب المشرف للشهر (Draft)
// =====================================================
const calculateSupervisorPayroll = AsyncWrapper(async (req, res, next) => {
    const academy_id = getAcademyId(req);
    const { supervisor_id, billing_month, bonuses = [], deductions = [], notes } = req.body;

    if (!supervisor_id || !billing_month) {
        const error = new app_error();
        error.create('supervisor_id and billing_month are required', 400, http_status_text.FAIL);
        return next(error);
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(billing_month)) {
        const error = new app_error();
        error.create('billing_month must be in YYYY-MM format', 400, http_status_text.FAIL);
        return next(error);
    }

    const supervisor = await Supervisor.findOne({
        _id: supervisor_id,
        academy_id,
    });

    if (!supervisor) {
        const error = new app_error();
        error.create('Supervisor not found in this academy', 404, http_status_text.FAIL);
        return next(error);
    }

    const baseSalary = Number(supervisor.base_salary || 0);

    let totalBonuses = bonuses.reduce((acc, b) => acc + Number(b.amount || 0), 0);
    let totalDeductions = deductions.reduce((acc, d) => acc + Number(d.amount || 0), 0);

    let netSalary = baseSalary + totalBonuses - totalDeductions;
    if (netSalary < 0) netSalary = 0;

    netSalary = Math.round(netSalary * 100) / 100;
    totalBonuses = Math.round(totalBonuses * 100) / 100;
    totalDeductions = Math.round(totalDeductions * 100) / 100;

    const payroll = await SupervisorPayroll.findOneAndUpdate(
        { academy_id, supervisor: supervisor_id, billing_month },
        {
            academy_id,
            supervisor: supervisor_id,
            billing_month,
            base_salary: baseSalary,
            bonuses,
            total_bonuses: totalBonuses,
            deductions,
            total_deductions: totalDeductions,
            net_salary: netSalary,
            notes
        },
        { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
        status: http_status_text.SUCCESS,
        data: { payroll }
    });
});

// =====================================================
// 2. إضافة مكافأة (Bonus) لسجل مرتب مشرف
// =====================================================
const addBonusToSupervisorPayroll = AsyncWrapper(async (req, res, next) => {
    const academy_id = getAcademyId(req);
    const { payroll_id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0 || !reason) {
        const error = new app_error();
        error.create('Amount (greater than 0) and reason are required for bonus', 400, http_status_text.FAIL);
        return next(error);
    }

    const payroll = await SupervisorPayroll.findOne({ _id: payroll_id, academy_id });

    if (!payroll) {
        const error = new app_error();
        error.create('Supervisor payroll record not found', 404, http_status_text.FAIL);
        return next(error);
    }

    if (payroll.status === 'paid') {
        const error = new app_error();
        error.create('Cannot modify a payroll that has already been paid', 400, http_status_text.FAIL);
        return next(error);
    }

    payroll.bonuses.push({ amount: Number(amount), reason });
    payroll.total_bonuses = payroll.bonuses.reduce((acc, b) => acc + Number(b.amount), 0);

    let netSalary = payroll.base_salary + payroll.total_bonuses - payroll.total_deductions;
    payroll.net_salary = Math.max(0, Math.round(netSalary * 100) / 100);

    await payroll.save();

    return res.status(200).json({
        status: http_status_text.SUCCESS,
        data: { payroll }
    });
});

// =====================================================
// 3. إضافة خصم (Deduction) لسجل مرتب مشرف
// =====================================================
const addDeductionToSupervisorPayroll = AsyncWrapper(async (req, res, next) => {
    const academy_id = getAcademyId(req);
    const { payroll_id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0 || !reason) {
        const error = new app_error();
        error.create('Amount (greater than 0) and reason are required for deduction', 400, http_status_text.FAIL);
        return next(error);
    }

    const payroll = await SupervisorPayroll.findOne({ _id: payroll_id, academy_id });

    if (!payroll) {
        const error = new app_error();
        error.create('Supervisor payroll record not found', 404, http_status_text.FAIL);
        return next(error);
    }

    if (payroll.status === 'paid') {
        const error = new app_error();
        error.create('Cannot modify a payroll that has already been paid', 400, http_status_text.FAIL);
        return next(error);
    }

    payroll.deductions.push({ amount: Number(amount), reason });
    payroll.total_deductions = payroll.deductions.reduce((acc, d) => acc + Number(d.amount), 0);

    let netSalary = payroll.base_salary + payroll.total_bonuses - payroll.total_deductions;
    payroll.net_salary = Math.max(0, Math.round(netSalary * 100) / 100);

    await payroll.save();

    return res.status(200).json({
        status: http_status_text.SUCCESS,
        data: { payroll }
    });
});

// =====================================================
// 4. تغيير حالة المرتب إلى مدفوع (Paid) وإنشاء سند صرف
// =====================================================
const markPayrollAsPaid = AsyncWrapper(async (req, res, next) => {
    const academy_id = getAcademyId(req);
    const { payroll_id } = req.params;

    const payroll = await SupervisorPayroll.findOne({ _id: payroll_id, academy_id })
        .populate('supervisor', 'name');

    if (!payroll) {
        const error = new app_error();
        error.create('Supervisor payroll record not found', 404, http_status_text.FAIL);
        return next(error);
    }

    if (payroll.status === 'paid') {
        const error = new app_error();
        error.create('Payroll is already marked as paid', 400, http_status_text.FAIL);
        return next(error);
    }

    // 1. تحديث حالة المرتب وتاريخ الدفع
    payroll.status = 'paid';
    payroll.payment_date = new Date();
    await payroll.save();

    // 2. إنشاء سجل المصروف تلقائياً ليتكامل مع التقارير المالية
    const supervisorName = payroll.supervisor?.name || 'Supervisor';
    await Expense.create({
        academy_id,
        category: 'Salaries',
        title: `Supervisor Salary - ${supervisorName} (${payroll.billing_month})`,
        amount: payroll.net_salary,
        expense_date: payroll.payment_date,
        payment_method: 'cash',
        notes: `Automated expense generated from supervisor payroll ID: ${payroll._id}`
    });

    return res.status(200).json({
        status: http_status_text.SUCCESS,
        data: { payroll }
    });
});

// =====================================================
// 5. استعلام عن سجلات المرتبات
// =====================================================
const getSupervisorPayrolls = AsyncWrapper(async (req, res, next) => {
    const academy_id = getAcademyId(req);
    const { supervisor_id, billing_month, status } = req.query;

    const filter = { academy_id };
    if (supervisor_id) filter.supervisor = supervisor_id;
    if (billing_month) filter.billing_month = billing_month;
    if (status) filter.status = status;

    const payrolls = await SupervisorPayroll.find(filter)
        .populate({
            path: 'supervisor',
            populate: {
                path: 'user',
                select: 'name phone'
            }
            })
        .sort({ createdAt: -1 });
        
    return res.status(200).json({
        status: http_status_text.SUCCESS,
        data: { payrolls }
    });
});

module.exports = {
    calculateSupervisorPayroll,
    addBonusToSupervisorPayroll,
    addDeductionToSupervisorPayroll,
    markPayrollAsPaid,
    getSupervisorPayrolls
};