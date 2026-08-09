const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema(
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
        // الطالب
        // =========================================

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },

        // =========================================
        // مادة الطالب
        // =========================================

        student_subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentSubject',
            required: true
        },

        // =========================================
        // المعلم داخل الأكاديمية
        // =========================================

        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherAssignment',
            required: true
        },

        // =========================================
        // بداية الحصة
        //
        // يتم تقريبها إلى بداية الساعة
        //
        // 18:00 -> 18:00
        // 18:25 -> 18:00
        // 18:59 -> 18:00
        // =========================================

        lesson_date: {
            type: Date,
            required: true
        },

        // =========================================
        // مدة الحصة بالدقائق
        //
        // 60  = ساعة
        // 80  = 1.333 ساعة
        // 90  = 1.5 ساعة
        // 120 = ساعتين
        // =========================================

        duration_minutes: {
            type: Number,
            required: true,
            min: 1
        },

        // =========================================
        // حالة الحصة
        // =========================================

        status: {
            type: String,

            enum: [
                'scheduled',
                'completed',
                'cancelled'
            ],

            default: 'scheduled'
        },

        // =========================================
        // ملاحظات
        // =========================================

        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);


// =====================================================
// Prevent Duplicate Lesson
//
// نفس:
// academy
// + student assignment
// + student subject
// + teacher
// + hour
//
// لا يمكن تسجيله مرتين
// =====================================================

LessonSchema.index(
    {
        academy_id: 1,
        student_assignment: 1,
        student_subject: 1,
        teacher: 1,
        lesson_date: 1
    },
    {
        unique: true,
        name: 'unique_lesson_per_hour'
    }
);


// =====================================================
// Queries
// =====================================================

LessonSchema.index({
    academy_id: 1,
    student_assignment: 1,
    lesson_date: -1
});


LessonSchema.index({
    academy_id: 1,
    student_subject: 1,
    status: 1
});


module.exports =
    mongoose.model(
        'Lesson',
        LessonSchema
    );