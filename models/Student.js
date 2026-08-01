const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    academy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    family: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }],

    is_active: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Student', StudentSchema);