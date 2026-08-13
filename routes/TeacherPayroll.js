const express =
    require('express');

const router =
    express.Router();

const teacher_payroll_controller =
    require('../controllers/TeacherPayroll');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Generate Payroll
// =====================================================

router.route('/generate')
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        teacher_payroll_controller.generatePayroll

    );


// =====================================================
// Get All Payrolls
// =====================================================

router.route('/')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        teacher_payroll_controller.getPayrolls

    );


// =====================================================
// Add Discount
//
// Academy Admin ONLY
//
// =====================================================

router.route('/:payroll_id/discount')
    .patch(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        teacher_payroll_controller.addDiscount

    );


// =====================================================
// Get Single Payroll
// =====================================================

router.route('/:payroll_id')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        teacher_payroll_controller.getSinglePayroll

    );


// =====================================================
// Pay Payroll
// =====================================================

router.route('/:payroll_id/pay')
    .patch(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        teacher_payroll_controller.payPayroll

    );


// =====================================================
// Cancel Payroll
// =====================================================

router.route('/:payroll_id/cancel')
    .patch(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        teacher_payroll_controller.cancelPayroll

    );


module.exports =
    router;