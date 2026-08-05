const mongoose = require('mongoose');

const TeacherAssignmentSchema = new mongoose.Schema({

    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },

    academy_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupervisorAssignment',
        required: true
    },

    price_per_lesson: {
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

TeacherAssignmentSchema.index(
    {
        teacher: 1,
        academy_id: 1
    },
    {
        unique: true
    }
);

module.exports =
    mongoose.model(
        'TeacherAssignment',
        TeacherAssignmentSchema
    );