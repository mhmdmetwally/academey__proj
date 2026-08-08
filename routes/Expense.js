const express = require('express');

const router =
    express.Router();

const expense_controller =
    require('../controllers/Expense');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Create Expense
// =====================================================

router.route('/')
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        expense_controller.createExpense

    );


// =====================================================
// Get Expenses
// =====================================================

router.route('/')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        expense_controller.getExpenses

    );


// =====================================================
// Get Single Expense
// =====================================================

router.route('/:expense_id')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        expense_controller.getSingleExpense

    );


// =====================================================
// Update Expense
// =====================================================

router.route('/:expense_id')
    .patch(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        expense_controller.updateExpense

    );


// =====================================================
// Cancel Expense
// =====================================================

router.route('/:expense_id')
    .delete(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        expense_controller.cancelExpense

    );


module.exports =
    router;