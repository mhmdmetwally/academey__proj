const express = require('express');
const router = express.Router();

const {
    generatePayroll,
    addDiscount,
    addBonus,
    getPayrolls,
    getSinglePayroll,
    payPayroll,
    cancelPayroll
} = require('../controllers/TeacherPayroll');

// =====================================================
// Payroll Routes
// =====================================================

// Get all payrolls / Generate new payroll
router
    .route('/')
    .get(getPayrolls)
    .post(generatePayroll);

// Get single payroll details
router
    .route('/:payroll_id')
    .get(getSinglePayroll);

// Add discount to payroll
router
    .route('/:payroll_id/discount')
    .post(addDiscount);

// Add bonus to payroll
router
    .route('/:payroll_id/bonus')
    .post(addBonus);

// Pay payroll (full or partial)
router
    .route('/:payroll_id/pay')
    .post(payPayroll);

// Cancel payroll
router
    .route('/:payroll_id/cancel')
    .post(cancelPayroll);

module.exports = router;