const mongoose = require('mongoose');


// =====================================================
// Payroll Lesson Snapshot
// =====================================================

const PayrollLessonSchema = new mongoose.Schema(
    {
        // =========================================
        // Original Lesson
        // =========================================

        lesson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true
        },

        // =========================================
        // Lesson Date Snapshot
        // =========================================

        lesson_date: {
            type: Date,
            required: true
        },

        // =========================================
        // Duration
        // =========================================

        duration_minutes: {
            type: Number,
            required: true,
            min: 1
        },

        // =========================================
        // Lesson Units
        // =========================================

        lesson_units: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // Price Snapshot
        // =========================================

        price_per_lesson: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // Lesson Amount
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
// Payroll Discount
// =====================================================
//
// كل خصم خاص بهذا الـ Payroll / الشهر
//
// مثال:
//
// {
//     amount: 200,
//     note: "خصم غياب"
// }
//
// =====================================================

const PayrollDiscountSchema = new mongoose.Schema(
    {
        // =========================================
        // Discount Amount
        // =========================================

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // Discount Reason / Note
        // =========================================

        note: {
            type: String,
            required: true,
            trim: true
        },

        // =========================================
        // Created At
        // =========================================

        created_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: true
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
        // Price Per Lesson Snapshot
        // =========================================

        price_per_lesson: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // Base Amount
        //
        // إجمالي الحصص قبل الخصومات
        // =========================================

        base_amount: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // Discounts
        //
        // كل خصم له:
        // amount
        // note
        // =========================================

        discounts: {
            type: [PayrollDiscountSchema],
            default: []
        },

        // =========================================
        // Total Discount Amount
        //
        // مجموع كل الخصومات
        // =========================================

        discount_amount: {
            type: Number,
            default: 0,
            min: 0
        },

        // =========================================
        // Final Salary
        //
        // base_amount - discount_amount
        // =========================================

        total_amount: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // Paid
        // =========================================

        paid_amount: {
            type: Number,
            default: 0,
            min: 0
        },

        // =========================================
        // Remaining
        // =========================================

        remaining_amount: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // Status
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
        // Full Payment Date
        // =========================================

        paid_at: {
            type: Date,
            default: null
        },

        // =========================================
        // Generated At
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

// One Payroll per Teacher Assignment per Month

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


// Academy + Month

TeacherPayrollSchema.index({
    academy_id: 1,
    billing_month: 1
});


// Teacher + Month

TeacherPayrollSchema.index({
    academy_id: 1,
    teacher: 1,
    billing_month: 1
});


module.exports =
    mongoose.model(
        'TeacherPayroll',
        TeacherPayrollSchema
    );