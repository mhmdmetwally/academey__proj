const express = require('express');

const router = express.Router();

const academy_controller =
    require('../controllers/Academy');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');

// =====================================================
// Public Routes
// =====================================================

// Register Academy
router.post(
    '/register',
    academy_controller.register
);

// Academy Login
router.post(
    '/login',
    academy_controller.login
);


// =====================================================
// Academy Admin Routes
// =====================================================

// Get My Academy
router.get(
    '/me',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.getMyAcademy
);


// Update Academy
router.patch(
    '/me',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.updateAcademy
);


// Change Academy Password
router.patch(
    '/change-password',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.changePassword
);


// =====================================================
// Supervisor Management
// Academy Admin Only
// =====================================================

// Activate Supervisor
router.patch(
    '/supervisor/active',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.patchActiveSupervisor
);


// Stop Supervisor
router.patch(
    '/supervisor/stop',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.patchStopSupervisor
);


module.exports = router;