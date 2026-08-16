const express = require('express');
const router = express.Router();


// =====================================================
// Controller
// =====================================================

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
// Middleware
// =====================================================

const verify_token = require('../middleware/VerifyToken');
const allowed_to = require('../middleware/AllowedTools');


// =====================================================
// User Roles
// =====================================================

const user_role = require('../utils/UserRole');


// =====================================================
// Authentication & Authorization
// =====================================================

router.use(verify_token);

router.use(
    allowed_to(
        user_role.academy_admin,
        user_role.supervisor
    )
);


// =====================================================
// Payroll Routes
// =====================================================


// Get all payrolls
router
    .route('/')
    .get(getPayrolls);


// Generate new payroll
router
    .route('/')
    .post(generatePayroll);


// Get single payroll
router
    .route('/:payroll_id')
    .get(getSinglePayroll);


// Add discount
router
    .route('/:payroll_id/discount')
    .post(addDiscount);


// Add bonus
router
    .route('/:payroll_id/bonus')
    .post(addBonus);


// Pay payroll
router
    .route('/:payroll_id/pay')
    .post(payPayroll);


// Cancel payroll
router
    .route('/:payroll_id/cancel')
    .post(cancelPayroll);


module.exports = router;