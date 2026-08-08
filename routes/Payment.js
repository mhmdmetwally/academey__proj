const express = require('express');

const router = express.Router();

const payment_controller =
    require('../controllers/Payment');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Create Payment
// =====================================================

router.route('/')
    .post(
        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        payment_controller.createPayment
    );


// =====================================================
// Get Payments
// =====================================================

router.route('/')
    .get(
        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        payment_controller.getPayments
    );


// =====================================================
// Get Single Payment
// =====================================================

router.route('/:payment_id')
    .get(
        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        payment_controller.getSinglePayment
    );


// =====================================================
// Get Invoice Payments
// =====================================================

router.route('/invoice/:invoice_id')
    .get(
        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        payment_controller.getInvoicePayments
    );


// =====================================================
// Allocate Advance Payment
// =====================================================

router.route('/:payment_id/allocate')
    .post(
        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        payment_controller.allocateAdvancePayment
    );


// =====================================================
// Cancel Payment
// =====================================================

router.route('/:payment_id')
    .delete(
        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        payment_controller.cancelPayment
    );


module.exports = router;
