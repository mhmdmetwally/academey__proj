const express = require('express');

const router = express.Router();

const admin_controller =
    require('../controllers/Admin');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =========================
// Academy Student Count
// =========================

router.get(
    '/student_count/:academy_id',

    verify_token,

    allowed_tool(
        user_role.super_admin
    ),

    admin_controller.getCountStudentsAcademy
);


// =========================
// Show All Academies
// =========================

router.get(
    '/academy/showallacademy',

    verify_token,

    allowed_tool(
        user_role.super_admin
    ),

    admin_controller.getShowAllAcademey
);


// =========================
// Single Academy
// =========================

router.get(
    '/academy/singleacademy/:academy_id',

    verify_token,

    allowed_tool(
        user_role.super_admin
    ),

    admin_controller.getSingleAcademy
);


// =========================
// Stop Academy
// =========================

router.patch(
    '/academy/stop/:academy_id',

    verify_token,

    allowed_tool(
        user_role.super_admin
    ),

    admin_controller.patchStopAcademy
);


// =========================
// Activate Academy
// =========================

router.patch(
    '/academy/active/:academy_id',

    verify_token,

    allowed_tool(
        user_role.super_admin
    ),

    admin_controller.patchActiveAcademy
);


module.exports = router;