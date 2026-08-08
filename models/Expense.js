const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
    {
        academy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Academy',
            required: true
        },

        // نوع المصروف
        category: {
            type: String,
            enum: [
                'teacher_salary',
                'advertising',
                'media_buyer',
                'rent',
                'internet',
                'software',
                'transportation',
                'equipment',
                'other'
            ],
            required: true
        },

        // اسم / وصف المصروف
        title: {
            type: String,
            required: true,
            trim: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01
        },

        expense_date: {
            type: Date,
            required: true,
            default: Date.now
        },

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

        reference: {
            type: String,
            trim: true
        },

        notes: {
            type: String,
            trim: true
        },

        status: {
            type: String,
            enum: [
                'completed',
                'cancelled'
            ],
            default: 'completed'
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
    status: 1,
    expense_date: 1
});


module.exports =
    mongoose.model(
        'Expense',
        ExpenseSchema
    );