const mongoose = require('mongoose');


// =====================================================
// Monthly Lessons History
// =====================================================

const MonthlyLessonsHistorySchema =
    new mongoose.Schema(
        {
            // =========================================
            // الشهر
            // YYYY-MM
            // =========================================

            month: {
                type: String,

                required: true,

                match:
                    /^\d{4}-(0[1-9]|1[0-2])$/
            },

            // =========================================
            // عدد الحصص المقرر لهذا الشهر
            // =========================================

            lessons: {
                type: Number,

                required: true,

                min: 0
            },

            // =========================================
            // ملاحظة
            // =========================================

            note: {
                type: String,

                trim: true,

                default: null
            }
        },
        {
            _id: false
        }
    );


// =====================================================
// Student Subject
// =====================================================

const StudentSubjectSchema =
    new mongoose.Schema(
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
            // المعلم المسؤول
            // =========================================

            teacher: {
                type: mongoose.Schema.Types.ObjectId,

                ref: 'TeacherAssignment',

                required: true
            },


            // =========================================
            // سعر الحصة
            // =========================================

            price_per_lesson: {
                type: Number,

                required: true,

                min: 0
            },


            // =========================================
            // عدد الحصص الشهري الحالي
            // =========================================

            monthly_lessons: {
                type: Number,

                required: true,

                min: 0
            },


            // =========================================
            // تاريخ عدد الحصص الشهري
            // =========================================

            monthly_lessons_history: {

                type:
                    [MonthlyLessonsHistorySchema],

                default: []
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
// الطالب لا يأخذ نفس المادة مرتين
// داخل نفس الأكاديمية
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
// البحث السريع
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


// =====================================================
// البحث في History
// =====================================================

StudentSubjectSchema.index({
    academy_id: 1,
    'monthly_lessons_history.month': 1
});


module.exports =
    mongoose.model(
        'StudentSubject',
        StudentSubjectSchema
    );