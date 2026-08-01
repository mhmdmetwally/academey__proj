const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    academy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }],

    session_price: {
        type: Number,
        required: true,
        min: 0
    },

    is_active: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Teacher', TeacherSchema);