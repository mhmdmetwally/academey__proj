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

    /*
    The lesson is stored by hour.
    
    Example:
    2026-08-05 18:00
    2026-08-05 18:25
    
    Both become:
    2026-08-05 18:00
    */

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


/*
=====================================================
Prevent duplicate lesson
=====================================================

The same:

academy
+
student
+
student subject
+
teacher
+
hour

cannot be registered twice.
*/

LessonSchema.index(
    {
        academy_id: 1,
        student_assignment: 1,
        student_subject: 1,
        teacher: 1,
        lesson_date: 1
    },
    {
        unique: true,
        name: 'unique_lesson_per_hour'
    }
);


module.exports =
    mongoose.model('Lesson', LessonSchema);