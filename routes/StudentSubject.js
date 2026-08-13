const express = require('express');

const router = express.Router();

const student_subject_controller =
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
        user_role.academy_admin,
        user_role.supervisor
    ),
    student_subject_controller.addSubjectToStudent
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
        user_role.academy_admin,
        user_role.supervisor
    ),
    student_subject_controller.getStudentSubjects
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
        user_role.academy_admin,
        user_role.supervisor
    ),
    student_subject_controller.changeStudentTeacher
);


// =====================================================
// Change Student Price
// =====================================================

router.route(
    '/:student_subject_id/price'
)
.patch(
    verify_token,
    allowed_tool(
        user_role.academy_admin,
        user_role.supervisor
    ),
    student_subject_controller.changeStudentPrice
);



// =====================================================
// Change Monthly Lessons
// =====================================================

router.route(
    '/:student_subject_id/monthly-lessons'
)
.patch(
    verify_token,

    allowed_tool(
        user_role.academy_admin,
        user_role.supervisor
    ),

    student_subject_controller.changeMonthlyLessons
);


// =====================================================
// Remove Subject From Student
// =====================================================

router.route(
    '/:student_subject_id'
)
.delete(
    verify_token,
    allowed_tool(
        user_role.academy_admin,
        user_role.supervisor
    ),
    student_subject_controller.removeSubjectFromStudent
);


module.exports = router;