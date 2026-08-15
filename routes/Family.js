const express =
    require('express');

const router =
    express.Router();

const family_controller =
    require('../controllers/Family');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Create Family
// Academy Admin / Supervisor
// =====================================================

router.post(

    '/',

    verify_token,

    allowed_tool(
        user_role.academy_admin,
        user_role.supervisor
    ),

    family_controller.createFamily

);

// =====================================================
// Academy Admin Gets All Families
// =====================================================

router.get(

    '/academy-families',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    family_controller.getAcademyFamilies

);


module.exports =
    router;