const express =
    require('express');

const router =
    express.Router();

const student_controller =
    require('../controllers/Student');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Academy Admin
// Supervisor
// =====================================================

// Create Student
router.route('/')
    .post(
        verify_token,
        allowed_tool(
            user_role.academy_admin,
             user_role.supervisor
        ),
        student_controller.createStudent
    );


// Get Academy Students
router.route('/')
    .get(
        verify_token,
        allowed_tool(
            user_role.academy_admin
        ),
        student_controller.getAcademyStudents
    );


// Student gets his academies
router.route('/my-academies')
    .get(
        verify_token,
        allowed_tool(
            user_role.student
        ),
        student_controller.getMyAcademies
    );


// Get / Update Student Assignment
router.route('/:student_id')
    .get(
        verify_token,
        allowed_tool(
            user_role.academy_admin
        ),
        student_controller.getSingleStudent
    )

    .patch(
        verify_token,
        allowed_tool(
            user_role.academy_admin
        ),
        student_controller.updateStudentAssignment
    );


module.exports =
    router;