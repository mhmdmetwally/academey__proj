
const mongoose = require('mongoose');
const validator = require('validator');

const UserSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true,

        validate: [
            (value) =>
                validator.isLength(
                    value,
                    {
                        min: 3,
                        max: 40
                    }
                ),

            "الاسم على الأقل 3 احرف وعلى الأكثر 40"
        ]
    },

    phone: {
        type: String,
        unique: true,
        sparse: true,
        required: true
    },

    password: {
        type: String,
        required: true,
    },

    role: {
        type: String,

        enum: [
            'super_admin',
            'supervisor',
        ],

        required: true
    },

    is_active: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});


module.exports =
    mongoose.model('User', UserSchema);

