const mongoose = require('mongoose');

const StudentSubjectSchema = new mongoose.Schema(
    {
        // الطالب داخل أكاديمية معينة
        student_assignment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentAssignment',
            required: true
        },

        // المادة
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true
        },

        // المعلم المسؤول عن المادة
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherAssignment',
            required: true
        },

        // سعر الطالب للحصة
        // Snapshot للسعر وقت إضافة المادة للطالب
        price_per_lesson: {
            type: Number,
            required: true,
            min: 0
        },

        is_active: {
            type: Boolean,
            default: true
        },

        started_at: {
            type: Date,
            default: Date.now
        },

        ended_at: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


// الطالب لا يأخذ نفس المادة مرتين
StudentSubjectSchema.index(
    {
        student_assignment: 1,
        subject: 1
    },
    {
        unique: true
    }
);


// البحث السريع عن مواد الطالب
StudentSubjectSchema.index({
    student_assignment: 1,
    is_active: 1
});


// البحث عن الطلاب المرتبطين بمعلم
StudentSubjectSchema.index({
    teacher: 1,
    is_active: 1
});


module.exports =
    mongoose.model(
        'StudentSubject',
        StudentSubjectSchema
    );