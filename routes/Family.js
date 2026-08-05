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


// Family gets all his students

router.route('/my-students')
    .get(
        verify_token,

        allowed_tool(
            user_role.family
        ),

        family_controller.getMyStudents
    );


// Family gets single student

router.route('/student/:student_id')
    .get(
        verify_token,

        allowed_tool(
            user_role.family
        ),

        family_controller.getSingleStudent
    );


module.exports =
    router;