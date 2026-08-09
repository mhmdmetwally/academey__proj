const mongoose = require('mongoose');

const StudentSubjectSchema = new mongoose.Schema(
    {
        // =========================================
        // الأكاديمية
        // =========================================

        academy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Academy',
            required: true
        },

        // =========================================
        // الطالب داخل الأكاديمية
        // =========================================

        student_assignment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentAssignment',
            required: true
        },

        // =========================================
        // المادة
        // =========================================

        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true
        },

        // =========================================
        // المعلم المسؤول عن المادة
        // =========================================

        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherAssignment',
            required: true
        },

        // =========================================
        // سعر الساعة للطالب
        //
        // اسم الحقل يظل price_per_lesson
        // حتى لا نكسر باقي المشروع.
        //
        // لكن معناه:
        // price per hour
        // =========================================

        price_per_lesson: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // الحالة
        // =========================================

        is_active: {
            type: Boolean,
            default: true
        },

        // =========================================
        // بداية المادة
        // =========================================

        started_at: {
            type: Date,
            default: Date.now
        },

        // =========================================
        // نهاية المادة
        // =========================================

        ended_at: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


// =====================================================
// الطالب لا يأخذ نفس المادة مرتين داخل نفس الأكاديمية
// =====================================================

StudentSubjectSchema.index(
    {
        academy_id: 1,
        student_assignment: 1,
        subject: 1
    },
    {
        unique: true
    }
);


// =====================================================
// البحث السريع عن مواد الطالب داخل الأكاديمية
// =====================================================

StudentSubjectSchema.index({
    academy_id: 1,
    student_assignment: 1,
    is_active: 1
});


// =====================================================
// البحث عن الطلاب المرتبطين بمعلم
// =====================================================

StudentSubjectSchema.index({
    academy_id: 1,
    teacher: 1,
    is_active: 1
});


module.exports =
    mongoose.model(
        'StudentSubject',
        StudentSubjectSchema
    );