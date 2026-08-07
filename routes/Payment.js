const express =
    require('express');

const router =
    express.Router();

const payment_controller =
    require('../controllers/Payment');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


/*
=====================================================
Create Payment
=====================================================
*/

router.route('/')
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        payment_controller.createPayment

    );


/*
=====================================================
Get Payments
=====================================================
*/

router.route('/')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        payment_controller.getPayments

    );


/*
=====================================================
Get Single Payment
=====================================================
*/

router.route(
    '/:payment_id'
)
.get(

    verify_token,

    allowed_tool(
        user_role.academy_admin,
        user_role.supervisor
    ),

    payment_controller.getSinglePayment

);


module.exports =
    router;