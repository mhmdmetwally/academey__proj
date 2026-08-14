const express = require('express');

const router = express.Router();

const academy_controller =
    require('../controllers/Academy');

const validate_password =
    require('../middleware/ValidatePassword');
    
const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Public Routes
// =====================================================

router.post(
    '/register',

    validate_password('password'),

    academy_controller.register
);

router.post(
    '/login',
    academy_controller.login
);

router.route('/logout')
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        academy_controller.logout

    );

// =====================================================
// Academy Admin
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


// Update My Academy
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

    validate_password('new_password'),

    academy_controller.changePassword
);


// =====================================================
// Supervisor Management
// Academy Admin Only
// =====================================================

// Create Supervisor
router.post(
    '/supervisor',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.createSupervisor
);

// Get All Supervisors
router.get(
    '/supervisor',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.getAllSupervisors
);


// Get Single Supervisor
router.get(
    
    '/supervisor/:supervisor_id',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.getSingleSupervisor
);


// Activate Supervisor
router.patch(
    '/supervisor/active/:supervisor_id',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.patchActiveSupervisor
);


// Stop Supervisor
router.patch(
    '/supervisor/stop/:supervisor_id',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.patchStopSupervisor
);


module.exports = router;