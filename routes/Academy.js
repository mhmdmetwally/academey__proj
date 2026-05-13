const express = require('express');
const router = express.Router();
const academy_controller = require('../controllers/Academy');
const allowed_tool = require('../middleware/AllowedTools');
const user_role = require('../utils/UserRole');
const verify_token = require('../middleware/VerifyToken');

router.route('/register').post(
    academy_controller.register
);

router.route('/login').post(
    academy_controller.login
);

router.route('/supervisor/active').patch(
    verify_token,
    allowed_tool(user_role.academy_admin),academy_controller.patchActiveSupervisor
);

router.route('/supervisor/stop').patch(
    verify_token,
    allowed_tool(user_role.academy_admin),
    academy_controller.patchStopSupervisor
);

module.exports = router;