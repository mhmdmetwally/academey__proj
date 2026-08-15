const express =
    require('express');


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



// =====================================================
// Create Teacher
// Academy Admin OR Supervisor
// =====================================================

router.route('/')
    .post(
        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        teacher_controller.createTeacher
    );



// =====================================================
// Supervisor Gets His Teachers
// =====================================================

router.route('/my-teachers')
    .get(
        verify_token,

        allowed_tool(
            user_role.supervisor
        ),

        teacher_controller.getMyTeachers
    );



// =====================================================
// Academy Admin Gets All Teachers
// =====================================================

router.route('/academy-teachers')
    .get(
        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        teacher_controller.getAcademyTeachers
    );



// =====================================================
// Supervisor Gets Single Teacher
// =====================================================

router.route('/my-teachers/:teacher_id')
    .get(
        verify_token,

        allowed_tool(
            user_role.supervisor
        ),

        teacher_controller.getSingleTeacher
    );



// =====================================================
// Academy Admin Gets Single Teacher
// =====================================================

router.route('/academy-teachers/:teacher_id')
    .get(
        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        teacher_controller.getAcademySingleTeacher
    );



// =====================================================
// Academy Admin Updates Teacher Assignment
// =====================================================

router.route('/:teacher_id')
    .patch(
        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        teacher_controller.updateTeacher
    );



module.exports =
    router;