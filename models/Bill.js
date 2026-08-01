const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({

    academy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    type: {
        type: String,
        enum: [
            'student_invoice',
            'teacher_invoice'
        ],
        required: true
    },

    // موجود في student_invoice
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },

    // الأسرة التي تتبع لها الفاتورة
    family: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // موجود في teacher_invoice
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    },

    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    },

    period_start: {
        type: Date
    },

    period_end: {
        type: Date
    },

    sessions_count: {
        type: Number,
        default: 0,
        min: 0
    },

    session_price: {
        type: Number,
        default: 0,
        min: 0
    },

    amount: {
        type: Number,
        required: true,
        min: 0
    },

    paid_amount: {
        type: Number,
        default: 0,
        min: 0
    },

    status: {
        type: String,
        enum: [
            'pending',
            'partial',
            'paid',
            'cancelled'
        ],
        default: 'pending'
    },

    paid_at: {
        type: Date
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Bill', BillSchema);