const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({

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

    student_price: {
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


// نفس المادة بالاسم لا تتكرر في نفس الأكاديمية

SubjectSchema.index(
    {
        academy: 1,
        name: 1
    },
    {
        unique: true
    }
);

module.exports =
    mongoose.model(
        'Subject',
        SubjectSchema
    );