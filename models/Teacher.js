
const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({

    // =========================================
    // User Account
    // =========================================

    user: {
        type: mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: true
    },


    // =========================================
    // Academy
    // =========================================

    academy_id: {
        type: mongoose.Schema.Types.ObjectId,

        ref: 'Academy',

        required: true
    },


    // =========================================
    // Supervisor
    // =========================================

    supervisor: {
        type: mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: true
    },


    // =========================================
    // Price per lesson
    // =========================================

    price_per_lesson: {
        type: Number,

        required: true,

        min: 0
    },


    // =========================================
    // Active
    // =========================================

    is_active: {
        type: Boolean,

        default: true
    }

}, {
    timestamps: true
});


// =========================================
// Same teacher cannot be added twice
// to the same academy
// =========================================

TeacherSchema.index(
    {
        user: 1,
        academy_id: 1
    },
    {
        unique: true
    }
);


module.exports =
    mongoose.model('Teacher', TeacherSchema);

