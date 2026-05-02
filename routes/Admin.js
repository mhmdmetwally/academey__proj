const express = require('express');
const router = express.Router();
const admin_controller = require('../controllers/Admin');
const allowed_tool = require('../middleware/AllowedTools');
const user_role = require('../utils/UserRole')
router.route('/academy/student_count')
.get(allowed_tool(user_role.super_admin),admin_controller.getCountStudentsAcademy);

router.route('/academy/showallacademy')
.get(allowed_tool(user_role.super_admin),admin_controller.getShowAllAcademey);

router.route('/academy/singleacademy')
.get(allowed_tool(user_role.super_admin),admin_controller.getSingleAcademy);

router.route('/academy/stop')
.patch(allowed_tool(user_role.super_admin),admin_controller.patchStopAcademy);

router.route('/academy/active')
.patch(allowed_tool(user_role.super_admin),admin_controller.patchActiveAcademy);

module.exports=router;