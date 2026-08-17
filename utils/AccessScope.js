const mongoose = require('mongoose');

const StudentAssignment = require('../models/StudentAssignment');
const TeacherAssignment = require('../models/TeacherAssignment');
const StudentSubject = require('../models/StudentSubject');
const Lesson = require('../models/Lesson');
const Supervisor = require('../models/Supervisor');
const user_role = require('./UserRole');


// =====================================================
// Get Academy ID
// =====================================================

const getAcademyId = (req) => {

    if (!req || !req.user) {
        return null;
    }

    if (
        req.user.role ===
        user_role.academy_admin
    ) {
        return req.user.id;
    }

    return req.user.academy_id;
};


// =====================================================
// Validate ObjectId
// =====================================================

const isValidObjectId = (id) => {

    return mongoose.Types.ObjectId.isValid(id);

};


// =====================================================
// Get Supervisor
// =====================================================

const getSupervisor = async (req) => {

    if (!req || !req.user) {
        return null;
    }


    const academy_id =
        getAcademyId(req);


    if (!academy_id) {
        return null;
    }


    if (
        req.user.role !==
        user_role.supervisor
    ) {
        return null;
    }


    // IMPORTANT:
    // req.user.id = User ID
    // Supervisor.user = User ID

    return await Supervisor.findOne({

        user:
            req.user.id,

        academy_id,

        is_active: true

    });

};


// =====================================================
// Student Access
// =====================================================

const getStudentAssignmentForUser = async (
    req,
    student_assignment_id
) => {

    if (
        !isValidObjectId(
            student_assignment_id
        )
    ) {
        return null;
    }


    const academy_id =
        getAcademyId(req);


    if (!academy_id) {
        return null;
    }


    // =================================================
    // Academy Admin
    // =================================================

    if (
        req?.user?.role ===
        user_role.academy_admin
    ) {

        return await StudentAssignment.findOne({

            _id:
                student_assignment_id,

            academy_id

        });

    }


    // =================================================
    // Supervisor
    // =================================================

    if (
        req?.user?.role ===
        user_role.supervisor
    ) {

        const supervisor =
            await getSupervisor(req);


        if (!supervisor) {
            return null;
        }


        return await StudentAssignment.findOne({

            _id:
                student_assignment_id,

            academy_id,

            supervisor:
                supervisor._id

        });

    }


    return null;

};


// =====================================================
// Teacher Access
// =====================================================

const getTeacherAssignmentForUser = async (
    req,
    teacher_assignment_id
) => {

    if (
        !isValidObjectId(
            teacher_assignment_id
        )
    ) {
        return null;
    }


    const academy_id =
        getAcademyId(req);


    if (!academy_id) {
        return null;
    }


    // =================================================
    // Academy Admin
    // =================================================

    if (
        req?.user?.role ===
        user_role.academy_admin
    ) {

        return await TeacherAssignment.findOne({

            _id:
                teacher_assignment_id,

            academy_id

        });

    }


    // =================================================
    // Supervisor
    // =================================================

    if (
        req?.user?.role ===
        user_role.supervisor
    ) {

        const supervisor =
            await getSupervisor(req);


        if (!supervisor) {
            return null;
        }


        return await TeacherAssignment.findOne({

            _id:
                teacher_assignment_id,

            academy_id,

            supervisor:
                supervisor._id

        });

    }


    return null;

};


// =====================================================
// Student Subject Access
// =====================================================

const getStudentSubjectForUser = async (
    req,
    student_subject_id
) => {

    if (
        !isValidObjectId(
            student_subject_id
        )
    ) {
        return null;
    }


    const academy_id =
        getAcademyId(req);


    if (!academy_id) {
        return null;
    }


    // =================================================
    // Find Student Subject
    // =================================================

    const studentSubject =
        await StudentSubject.findOne({

            _id:
                student_subject_id,

            academy_id

        });


    if (!studentSubject) {
        return null;
    }


    // =================================================
    // Check Student Access
    // =================================================

    const studentAssignment =
        await getStudentAssignmentForUser(

            req,

            studentSubject.student_assignment

        );


    if (!studentAssignment) {
        return null;
    }


    // =================================================
    // Check Current Teacher Assignment
    // =================================================

    const teacherAssignment =
        await TeacherAssignment.findOne({

            _id:
                studentSubject.teacher,

            academy_id

        });


    if (!teacherAssignment) {
        return null;
    }


    return studentSubject;

};


// =====================================================
// Lesson Access
// =====================================================

const getLessonForUser = async (
    req,
    lesson_id
) => {

    if (
        !isValidObjectId(
            lesson_id
        )
    ) {
        return null;
    }


    const academy_id =
        getAcademyId(req);


    if (!academy_id) {
        return null;
    }


    // =================================================
    // Find Lesson
    // =================================================

    const lesson =
        await Lesson.findOne({

            _id:
                lesson_id,

            academy_id

        });


    if (!lesson) {
        return null;
    }


    // =================================================
    // Academy Admin
    // =================================================

    if (
        req?.user?.role ===
        user_role.academy_admin
    ) {

        return lesson;

    }


    // =================================================
    // Supervisor
    // =================================================

    if (
        req?.user?.role ===
        user_role.supervisor
    ) {

        const studentAssignment =
            await getStudentAssignmentForUser(

                req,

                lesson.student_assignment

            );


        if (!studentAssignment) {
            return null;
        }


        return lesson;

    }


    return null;

};


// =====================================================
// Export
// =====================================================

module.exports = {

    getAcademyId,

    getSupervisor,

    getStudentAssignmentForUser,

    getTeacherAssignmentForUser,

    getStudentSubjectForUser,

    getLessonForUser

};