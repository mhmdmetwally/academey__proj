const express = require('express');

const router =
    express.Router();

const invoice_controller =
    require('../controllers/Invoice');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Create Invoice
// =====================================================

router.route('/')
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        invoice_controller.createInvoice

    );


// =====================================================
// Get Invoices
// =====================================================

router.route('/')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        invoice_controller.getInvoices

    );


// =====================================================
// Get Single Invoice
// =====================================================

router.route('/:invoice_id')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        invoice_controller.getSingleInvoice

    );


// =====================================================
// Cancel Invoice
// =====================================================

router.route('/:invoice_id')
    .delete(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        invoice_controller.cancelInvoice

    );


module.exports =
    router;