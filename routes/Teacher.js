const express = require('express');

const router =
    express.Router();

const teacher_controller =
    require('../controllers/Teacher');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// Academy Admin creates Teacher
router.route('/')
    .post(
        verify_token,
        allowed_tool(
            user_role.academy_admin
        ),
        teacher_controller.createTeacher
    );


// Supervisor gets his Teachers
router.route('/my-teachers')
    .get(
        verify_token,
        allowed_tool(
            user_role.supervisor
        ),
        teacher_controller.getMyTeachers
    );


// Supervisor gets single Teacher
router.route('/:teacher_id')
    .get(
        verify_token,
        allowed_tool(
            user_role.supervisor
        ),
        teacher_controller.getSingleTeacher
    );


// Academy Admin updates Teacher
router.route('/:teacher_id')
    .patch(
        verify_token,
        allowed_tool(
            user_role.academy_admin
        ),
        teacher_controller.updateTeacher
    );


module.exports = router;