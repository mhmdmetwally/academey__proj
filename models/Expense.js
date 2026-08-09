const mongoose = require('mongoose');

// =====================================================
// Expense
// =====================================================

const ExpenseSchema = new mongoose.Schema(
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
        // Payroll
        //
        // موجود فقط عندما يكون المصروف
        // خاص براتب مدرس
        // =========================================

        payroll: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherPayroll',
            default: null,
            index: true
        },

        // =========================================
        // Category
        // =========================================

        category: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        // =========================================
        // Title
        // =========================================

        title: {
            type: String,
            required: true,
            trim: true
        },

        // =========================================
        // Amount
        // =========================================

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================================
        // Expense Date
        // =========================================

        expense_date: {
            type: Date,
            default: Date.now,
            index: true
        },

        // =========================================
        // Payment Method
        // =========================================

        payment_method: {
            type: String,

            enum: [
                'cash',
                'bank_transfer',
                'wallet',
                'card',
                'other'
            ],

            default: 'cash'
        },

        // =========================================
        // Reference
        // =========================================

        reference: {
            type: String,
            trim: true
        },

        // =========================================
        // Status
        // =========================================

        status: {
            type: String,

            enum: [
                'completed',
                'cancelled'
            ],

            default: 'completed',

            index: true
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

ExpenseSchema.index({
    academy_id: 1,
    expense_date: 1
});

ExpenseSchema.index({
    academy_id: 1,
    category: 1,
    expense_date: 1
});

ExpenseSchema.index({
    academy_id: 1,
    payroll: 1
});

module.exports = mongoose.model(
    'Expense',
    ExpenseSchema
);