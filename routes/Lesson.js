const express =
    require('express');

const router =
    express.Router();

const lesson_controller =
    require('../controllers/Lesson');

const allowed_tool =
    require('../middleware/AllowedTools');

const user_role =
    require('../utils/UserRole');

const verify_token =
    require('../middleware/VerifyToken');


/*
=====================================================
Create Lesson
=====================================================
*/

router.route('/')
    .post(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        lesson_controller.createLesson

    );


/*
=====================================================
Get All Accessible Lessons
=====================================================
*/

router.route('/')
    .get(

        verify_token,

        allowed_tool(
            user_role.academy_admin,
            user_role.supervisor
        ),

        lesson_controller.getLessons

    );


/*
=====================================================
Get Student Lessons
=====================================================
*/

router.route(
    '/student/:student_assignment_id'
)
.get(

    verify_token,

    allowed_tool(
        user_role.academy_admin,
        user_role.supervisor
    ),

    lesson_controller.getStudentLessons

);


/*
=====================================================
Update Lesson Status
=====================================================
*/

router.route(
    '/:lesson_id/status'
)
.patch(

    verify_token,

    allowed_tool(
        user_role.academy_admin,
        user_role.supervisor
    ),

    lesson_controller.updateLessonStatus

);


/*
=====================================================
Cancel Lesson
=====================================================
*/

router.route(
    '/:lesson_id'
)
.delete(

    verify_token,

    allowed_tool(
        user_role.academy_admin,
        user_role.supervisor
    ),

    lesson_controller.cancelLesson

 );


module.exports =
    router;