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


// =========================
// Public
// =========================

router.post(
    '/register',
    academy_controller.register
);

router.post(
    '/login',
    academy_controller.login
);


// =========================
// Academy Admin
// =========================

router.patch(
    '/supervisor/active',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.patchActiveSupervisor
);


router.patch(
    '/supervisor/stop',

    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    academy_controller.patchStopSupervisor
);


module.exports = router;