const express = require('express');

const router =
    express.Router();

const subject_controller =
    require('../controllers/Subject');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


// =====================================================
// Create Subject
// Academy Admin only
// =====================================================

router.route('/')
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        subject_controller.createSubject

    );


// =====================================================
// Get Subjects
// =====================================================

router.route('/')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor,
            user_role.teacher
        ),

        subject_controller.getSubjects

    );


// =====================================================
// Add Teacher To Subject
// =====================================================

router.route(
    '/:subject_id/teacher/:teacher_id'
)
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        subject_controller.addTeacherToSubject

    );


// =====================================================
// Remove Teacher From Subject
// =====================================================

router.route(
    '/:subject_id/teacher/:teacher_id'
)
    .delete(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        subject_controller.removeTeacherFromSubject

    );


// =====================================================
// Single Subject
// =====================================================

router.route('/:subject_id')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor,
            user_role.teacher
        ),

        subject_controller.getSingleSubject

    );


// =====================================================
// Update Subject
// Academy Admin only
// =====================================================

router.route('/:subject_id')
    .patch(

        verify_token,

        allowed_tool(
            user_role.academy_admin
        ),

        subject_controller.updateSubject

    );


module.exports =
    router;

