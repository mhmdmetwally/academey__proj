const mongoose = require('mongoose');

const StudentAssignment = require('../models/StudentAssignment');
const TeacherAssignment = require('../models/TeacherAssignment');
const StudentSubject = require('../models/StudentSubject');
const Lesson = require('../models/Lesson');
const Supervisor = require('../models/Supervisor');
const user_role = require('./UserRole');

// =====================================================
// Get Academy ID (تعديل آمن)
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
// Validate ObjectId
// =====================================================
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// =====================================================
// Get Supervisor Assignment (تعديل آمن)
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
// Student Access (تعديل آمن)
// =====================================================
const getStudentAssignmentForUser = async (req, student_assignment_id) => {
    if (!isValidObjectId(student_assignment_id)) {
        return null;
    }

    const academy_id = getAcademyId(req);
    if (!academy_id) {
        return null;
    }

    if (req?.user?.role === user_role.academy_admin) {
        return await StudentAssignment.findOne({
            _id: student_assignment_id,
            academy_id,
        });
    }

    if (req?.user?.role === user_role.supervisor) {
        const supervisor = await getSupervisor(req);
        if (!supervisor) {
            return null;
        }

        return await StudentAssignment.findOne({
            _id: student_assignment_id,
            academy_id,
            supervisor: supervisor._id,
        });
    }

    return null;
};

// =====================================================
// Teacher Access (تعديل آمن)
// =====================================================
const getTeacherAssignmentForUser = async (req, teacher_assignment_id) => {
    if (!isValidObjectId(teacher_assignment_id)) {
        return null;
    }

    const academy_id = getAcademyId(req);
    if (!academy_id) {
        return null;
    }

    if (req?.user?.role === user_role.academy_admin) {
        return await TeacherAssignment.findOne({
            _id: teacher_assignment_id,
            academy_id,
        });
    }

    if (req?.user?.role === user_role.supervisor) {
        const supervisor = await getSupervisor(req);
        if (!supervisor) {
            return null;
        }

        return await TeacherAssignment.findOne({
            _id: teacher_assignment_id,
            academy_id,
            supervisor: supervisor._id,
        });
    }

    return null;
};

// =====================================================
// Student Subject Access
// =====================================================
const getStudentSubjectForUser = async (req, student_subject_id) => {
    if (!isValidObjectId(student_subject_id)) {
        return null;
    }

    const academy_id = getAcademyId(req);
    if (!academy_id) {
        return null;
    }

    const studentSubject = await StudentSubject.findOne({
        _id: student_subject_id,
        academy_id,
    });

    if (!studentSubject) {
        return null;
    }

    const studentAssignment = await getStudentAssignmentForUser(
        req,
        studentSubject.student_assignment
    );

    if (!studentAssignment) {
        return null;
    }

    const teacherAssignment = await TeacherAssignment.findOne({
        _id: studentSubject.teacher,
        academy_id,
    });

    if (!teacherAssignment) {
        return null;
    }

    return studentSubject;
};

// =====================================================
// Lesson Access (تعديل آمن)
// =====================================================
const getLessonForUser = async (req, lesson_id) => {
    if (!isValidObjectId(lesson_id)) {
        return null;
    }

    const academy_id = getAcademyId(req);
    if (!academy_id) {
        return null;
    }

    const lesson = await Lesson.findOne({
        _id: lesson_id,
        academy_id
    });

    if (!lesson) {
        return null;
    }

    if (req?.user?.role === user_role.academy_admin) {
        return lesson;
    }

    if (req?.user?.role === user_role.supervisor) {
        const studentAssignment = await getStudentAssignmentForUser(
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