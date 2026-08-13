const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        // الأكاديمية التي تملك المادة
        academy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Academy',
            required: true
        },

        // السعر الافتراضي للحصة في الأكاديمية
        // يمكن تغييره لطالب معين داخل StudentSubject
        student_price: {
            type: Number,
            required: true,
            min: 0
        },

        is_active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);


// =========================================
// نفس المادة لا تتكرر داخل نفس الأكاديمية
// =========================================

SubjectSchema.index(
    {
        academy_id: 1,
        name: 1
    },
    {
        unique: true
    }
);


module.exports = mongoose.model(
    'Subject',
    SubjectSchema
);