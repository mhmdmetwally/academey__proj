const express =
    require('express');

const router =
    express.Router();

const controller =
    require('../controllers/StudentSubject');

const verify_token =
    require('../middleware/VerifyToken');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');


// =====================================================
// Add Subject To Student
// =====================================================

router.route(
    '/student/:student_assignment_id'
)
.post(
    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    controller.addSubjectToStudent
);


// =====================================================
// Get Student Subjects
// =====================================================

router.route(
    '/student/:student_assignment_id'
)
.get(
    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    controller.getStudentSubjects
);


// =====================================================
// Change Teacher
// =====================================================

router.route(
    '/:student_subject_id/teacher'
)
.patch(
    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    controller.changeStudentTeacher
);


// =====================================================
// Remove Subject
// =====================================================

router.route(
    '/:student_subject_id'
)
.delete(
    verify_token,

    allowed_tool(
        user_role.academy_admin
    ),

    controller.removeSubjectFromStudent
);


module.exports =
    router;