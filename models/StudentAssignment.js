const mongoose = require('mongoose');

const StudentAssignmentSchema = new mongoose.Schema({

    // الطالب الأصلي
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },

    // الأكاديمية التي يدرس فيها الطالب
    academy_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    // الـ Family المسؤولة عن الطالب
    family: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true
    },

    // الـ Supervisor المسؤول عن الطالب
    // داخل أكاديمية معينة
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supervisor',
        required: true
    },

    is_active: {
        type: Boolean,
        default: true
    },

    joined_at: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});


// نفس الطالب لا يتكرر في نفس الأكاديمية
StudentAssignmentSchema.index(
    {
        student: 1,
        academy_id: 1
    },
    {
        unique: true
    }
);


// البحث السريع عن طلاب Supervisor
StudentAssignmentSchema.index({
    academy_id: 1,
    supervisor: 1
});


// البحث عن طلاب Family داخل الأكاديمية
StudentAssignmentSchema.index({
    academy_id: 1,
    family: 1
});


module.exports =
    mongoose.model(
        'StudentAssignment',
        StudentAssignmentSchema
    );