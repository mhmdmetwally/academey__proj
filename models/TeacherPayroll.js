const mongoose = require('mongoose');

// =====================================================
// Payroll Lesson Snapshot
// =====================================================

const PayrollLessonSchema = new mongoose.Schema(
    {
        // =========================================
        // الحصة الأصلية
        // =========================================

        lesson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true
        },

        // =========================================
        // تاريخ الحصة
        // Snapshot
        // =========================================

        lesson_date: {
            type: Date,
            required: true
        },

        // =========================================
        // مدة الحصة بالدقائق
        // Snapshot
        // =========================================

        duration_minutes: {
            type: Number,
            required: true,
            min: 1
        },

        // =========================================
        // وحدات الحصة
        //
        // 60  = 1
        // 80  = 1.3333
        // 90  = 1.5
        // 120 = 2
        // =========================================

        lesson_units: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // سعر الساعة وقت إنشاء Payroll
        // Snapshot
        // =========================================

        price_per_lesson: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // قيمة الحصة
        // Snapshot
        // =========================================

        amount: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        _id: false
    }
);

// =====================================================
// Teacher Payroll
// =====================================================

const TeacherPayrollSchema = new mongoose.Schema(
    {
        // =========================================
        // Academy
        // =========================================

        academy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Academy',
            required: true,
            index: true
        },

        // =========================================
        // Teacher Assignment
        //
        // مهم:
        // نفس المدرس ممكن يكون في أكثر من Academy
        // لذلك الربط يكون بالـ Assignment
        // =========================================

        teacher_assignment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherAssignment',
            required: true,
            index: true
        },

        // =========================================
        // Teacher
        // =========================================

        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
            required: true,
            index: true
        },

        // =========================================
        // Billing Month
        //
        // YYYY-MM
        // =========================================

        billing_month: {
            type: String,
            required: true,
            match: /^\d{4}-(0[1-9]|1[0-2])$/,
            index: true
        },

        // =========================================
        // Lessons Snapshot
        // =========================================

        lessons: {
            type: [PayrollLessonSchema],
            default: []
        },

        // =========================================
        // Total Lessons
        // =========================================

        total_lessons: {
            type: Number,
            default: 0,
            min: 1
        },

        // =========================================
        // Total Units
        // =========================================

        total_units: {
            type: Number,
            default: 0,
            min: 0
        },

        // =========================================
        // سعر الساعة وقت إنشاء Payroll
        // =========================================

        price_per_lesson: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // إجمالي الراتب
        // =========================================

        total_amount: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // المدفوع
        // =========================================

        paid_amount: {
            type: Number,
            default: 0,
            min: 0
        },

        // =========================================
        // المتبقي
        // =========================================

        remaining_amount: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // الحالة
        // =========================================

        status: {
            type: String,

            enum: [
                'pending',
                'partially_paid',
                'paid',
                'cancelled'
            ],

            default: 'pending',

            index: true
        },

        // =========================================
        // تاريخ الدفع الكامل
        // =========================================

        paid_at: {
            type: Date,
            default: null
        },

        // =========================================
        // تاريخ إنشاء Snapshot
        // =========================================

        generated_at: {
            type: Date,
            default: Date.now
        },

        // =========================================
        // Notes
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
// Indexes
// =====================================================

// =====================================================
// Payroll واحد فقط لكل مدرس داخل الأكاديمية في الشهر
// =====================================================

TeacherPayrollSchema.index(
    {
        academy_id: 1,
        teacher_assignment: 1,
        billing_month: 1
    },
    {
        unique: true
    }
);

// =====================================================
// البحث عن Payrolls للأكاديمية في شهر
// =====================================================

TeacherPayrollSchema.index({
    academy_id: 1,
    billing_month: 1
});

// =====================================================
// البحث عن Payrolls للمدرس
// =====================================================

TeacherPayrollSchema.index({
    academy_id: 1,
    teacher: 1,
    billing_month: 1
});

module.exports = mongoose.model(
    'TeacherPayroll',
    TeacherPayrollSchema
);