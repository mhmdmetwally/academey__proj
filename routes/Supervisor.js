const express =
    require('express');

const router =
    express.Router();

const supervisor_controller =
    require('../controllers/Supervisor');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// Supervisor gets his students

router.route('/my-students')
    .get(
        verify_token,

        allowed_tool(
            user_role.supervisor
        ),

        supervisor_controller.getMyStudents
    );


// Supervisor gets single student

router.route('/student/:student_id')
    .get(
        verify_token,

        allowed_tool(
            user_role.supervisor
        ),

        supervisor_controller.getSingleStudent
    );


module.exports =
    router;