const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
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

// نفس الاسم + الرقم = نفس المعلم
TeacherSchema.index(
    {
        name: 1,
        phone: 1
    },
    {
        unique: true
    }
);

module.exports =
    mongoose.model(
        'Teacher',
        TeacherSchema
    );