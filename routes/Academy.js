const express = require('express');
const router = express.Router();
const academy_controller = require('../controllers/Academy');
const allowed_tool = require('../middleware/AllowedTools');
const user_role = require('../utils/UserRole')

router.route('/register').post(
    academy_controller.register
);

router.route('/login').post(
    academy_controller.login
);

router.route('/supervisor/active').patch(
    allowed_tool(user_role.academy_admin),academy_controller.patchActiveSupervisor
);

router.route('/supervisor/stop').patch(
    allowed_tool(user_role.academy_admin),academy_controller.patchStopSupervisor
);

module.exports = router;