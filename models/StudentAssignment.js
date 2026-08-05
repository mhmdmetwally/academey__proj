
const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({

    academy_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    student_assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentAssignment',
        required: true
    },

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },

    student_subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentSubject',
        required: true
    },

    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeacherAssignment',
        required: true
    },

    lesson_date: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: [
            'scheduled',
            'completed',
            'cancelled'
        ],
        default: 'scheduled'
    },

    notes: {
        type: String,
        trim: true
    }

}, {
    timestamps: true
});


LessonSchema.index({
    academy_id: 1,
    student_assignment: 1,
    lesson_date: 1
});


module.exports =
    mongoose.model('Lesson', LessonSchema);

