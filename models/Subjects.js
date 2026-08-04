
const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({

    // =========================================
    // Subject Name
    // =========================================

    name: {
        type: String,

        required: true,

        trim: true
    },


    // =========================================
    // Academy
    // =========================================

    academy: {
        type: mongoose.Schema.Types.ObjectId,

        ref: 'Academy',

        required: true
    },


    // =========================================
    // Teachers
    // =========================================

    teachers: [
        {
            type: mongoose.Schema.Types.ObjectId,

            ref: 'Teacher'
        }
    ],


    // =========================================
    // Price paid by student
    // =========================================

    student_price: {
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


module.exports =
    mongoose.model('Subject', SubjectSchema);

