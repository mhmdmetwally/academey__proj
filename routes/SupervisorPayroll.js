const express = require('express');
const router = express.Router();

const supervisorPayrollController = require('../controllers/SupervisorPayroll');
const verifyToken = require('../middleware/VerifyToken');
const allowedTo = require('../middleware/AllowedTools');
const user_role = require('../utils/UserRole'); 

router.use(verifyToken);

// السماح لـ academy_admin و super_admin بالتحكم
router.use(allowedTo(user_role.academy_admin, user_role.super_admin));

router.route('/')
    .get(supervisorPayrollController.getSupervisorPayrolls)
    .post(supervisorPayrollController.calculateSupervisorPayroll);

// إضافة وتعديل / حذف البونس
router.route('/:payroll_id/bonus')
    .post(supervisorPayrollController.addBonusToSupervisorPayroll);

// إضافة وتعديل / حذف الخصومات
router.route('/:payroll_id/deduction')
    .post(supervisorPayrollController.addDeductionToSupervisorPayroll);

// الاعتماد والسداد
router.route('/:payroll_id/pay')
    .patch(supervisorPayrollController.markPayrollAsPaid);

router
    .route('/:payroll_id/salary')
    .post(supervisorPayrollController.updateSupervisorPayrollSalary);

module.exports = router;