const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        family: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
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

// نفس الاسم لا يتكرر داخل نفس Family
StudentSchema.index(
    {
        name: 1,
        family: 1
    },
    {
        unique: true
    }
);

module.exports =
    mongoose.model('Student', StudentSchema);