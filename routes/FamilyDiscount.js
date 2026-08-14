const express =
    require('express');

const router =
    express.Router();

const family_discount_controller =
    require('../controllers/FamilyDiscount');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Create Discount
// =====================================================

router.route('/')
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        family_discount_controller.createDiscount

    );


// =====================================================
// Get Discounts
// =====================================================

router.route('/')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        family_discount_controller.getDiscounts

    );


// =====================================================
// Get Single
// =====================================================

router.route('/:discount_id')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        family_discount_controller.getSingleDiscount

    );


// =====================================================
// Update
// =====================================================

router.route('/:discount_id')
    .patch(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        family_discount_controller.updateDiscount

    );


// =====================================================
// Cancel
// =====================================================

router.route('/:discount_id')
    .delete(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        family_discount_controller.cancelDiscount

    );


module.exports =
    router;