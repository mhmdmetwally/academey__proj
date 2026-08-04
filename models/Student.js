
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({

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
    // Family
    // =========================================

    family: {
        type: mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: true
    },


    // =========================================
    // Student Name
    // =========================================

    name: {
        type: String,

        required: true,

        trim: true
    },


    // =========================================
    // Subjects
    // =========================================

    subjects: [

        {

            subject: {
                type: mongoose.Schema.Types.ObjectId,

                ref: 'Subject',

                required: true
            },


            teacher: {
                type: mongoose.Schema.Types.ObjectId,

                ref: 'Teacher',

                required: true
            }

        }

    ]

}, {
    timestamps: true
});


module.exports =
    mongoose.model('Student', StudentSchema);

