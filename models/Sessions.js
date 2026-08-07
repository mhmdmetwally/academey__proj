const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({

    academy_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },

    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },

    date: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: [
            'completed',
            'cancelled'
        ],
        default: 'completed'
    },

    teacher_price: {
        type: Number,
        required: true,
        min: 0
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Session', SessionSchema);