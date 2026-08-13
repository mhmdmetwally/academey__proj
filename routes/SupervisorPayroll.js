const express = require('express');
const router = express.Router();

const supervisorPayrollController = require('../controllers/supervisorPayroll');
const verifyToken = require('../middleware/verifyToken');
const allowedTo = require('../middleware/allowedTo');
const user_role = require('../utils/userRoles'); // المسار حسب مكان ملف الـ roles عندك

router.use(verifyToken);

// السماح لـ academy_admin و super_admin بالتحكم
router.use(allowedTo(user_role.academy_admin, user_role.super_admin));

router.route('/')
    .get(supervisorPayrollController.getSupervisorPayrolls)
    .post(supervisorPayrollController.calculateSupervisorPayroll);

// إضافة وتعديل / حذف البونس
router.route('/:payroll_id/bonus')
    .post(supervisorPayrollController.addBonusToSupervisorPayroll);

router.route('/:payroll_id/bonus/:bonus_id')
    .delete(supervisorPayrollController.removeBonusFromSupervisorPayroll);

// إضافة وتعديل / حذف الخصومات
router.route('/:payroll_id/deduction')
    .post(supervisorPayrollController.addDeductionToSupervisorPayroll);

router.route('/:payroll_id/deduction/:deduction_id')
    .delete(supervisorPayrollController.removeDeductionFromSupervisorPayroll);

// الاعتماد والسداد
router.route('/:payroll_id/pay')
    .patch(supervisorPayrollController.markPayrollAsPaid);

module.exports = router;