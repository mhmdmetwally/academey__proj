const mongoose = require('mongoose');

const StudentAssignment =
    require('../models/StudentAssignment');

const TeacherAssignment =
    require('../models/TeacherAssignment');

const StudentSubject =
    require('../models/StudentSubject');

const Lesson =
    require('../models/Lesson');

const Supervisor =
    require('../models/Supervisor');

const user_role =
    require('./UserRole');




// =====================================================
// Validate ObjectId
// =====================================================

const isValidObjectId = (id) => {

    return mongoose.Types.ObjectId.isValid(id);
};

// =====================================================
// Get Academy ID (نسخة آمنة)
// =====================================================
const getAcademyId = (req) => {
    if (!req || !req.user) {
        return null;
    }

    if (req.user.role === user_role.academy_admin) {
        return req.user.id;
    }

    return req.user.academy_id;
};

// =====================================================
// Get Supervisor Assignment (نسخة آمنة)
// =====================================================
const getSupervisor = async (req) => {
    if (!req || !req.user) {
        return null;
    }

    const academy_id = getAcademyId(req);
    if (!academy_id) {
        return null;
    }

    if (req.user.role !== user_role.supervisor) {
        return null;
    }

    return await Supervisor.findOne({
        user: req.user.id,
        academy_id,
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


    // =========================================
    // Academy Admin
    // =========================================

    if (
        req.user.role ===
        user_role.academy_admin
    ) {

        return await StudentAssignment.findOne({

            _id:
                student_assignment_id,

            academy_id,


        });
    }


    // =========================================
    // Supervisor
    // =========================================

    if (
        req.user.role ===
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
                supervisor._id,

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


    // =========================================
    // Academy Admin
    // =========================================

    if (
        req.user.role ===
        user_role.academy_admin
    ) {

        return await TeacherAssignment.findOne({

            _id:
                teacher_assignment_id,

            academy_id,

        });
    }


    // =========================================
    // Supervisor
    // =========================================

    if (
        req.user.role ===
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
                supervisor._id,

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


    // =========================================
    // Student Subject must belong to academy
    // =========================================

    const studentSubject =
        await StudentSubject.findOne({

            _id:
                student_subject_id,

            academy_id,


        });


    if (!studentSubject) {
        return null;
    }


    // =========================================
    // Student Assignment Access
    // =========================================

    const studentAssignment =
        await getStudentAssignmentForUser(

            req,

            studentSubject.student_assignment

        );


    if (!studentAssignment) {
        return null;
    }


    // =========================================
    // Teacher must belong to same academy
    // =========================================

    const teacherAssignment =
        await TeacherAssignment.findOne({

            _id:
                studentSubject.teacher,

            academy_id,


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


    const lesson =
        await Lesson.findOne({

            _id:
                lesson_id,

            academy_id

        });


    if (!lesson) {
        return null;
    }


    // =========================================
    // Academy Admin
    // =========================================

    if (
        req.user.role ===
        user_role.academy_admin
    ) {

        return lesson;
    }


    // =========================================
    // Supervisor
    // =========================================

    if (
        req.user.role ===
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


module.exports = {

    getAcademyId,

    getSupervisor,

    getStudentAssignmentForUser,

    getTeacherAssignmentForUser,

    getStudentSubjectForUser,

    getLessonForUser

};