const mongoose = require('mongoose');
const validator = require('validator');

const UserSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true,
        validate: [
            (value) => validator.isLength(value, {
                min: 3,
                max: 40
            }),
            'الاسم على الأقل 3 أحرف وعلى الأكثر 40'
        ]
    },

    phone: {
        type: String,
        required: true,
        unique: true,
        sparse: true,
        trim: true
    },

    password: {
        type: String,
        required: true,
        validate: {
            validator: function(value) {
                return validator.isStrongPassword(value, {
                    minLength: 8,
                    minLowercase: 1,
                    minUppercase: 1,
                    minNumbers: 1,
                    minSymbols: 1
                });
            },
            message: 'كلمة المرور ضعيفة!'
        }
    },

    role: {
        type: String,
        enum: [
            'super_admin',
            'supervisor',
            'teacher',
            'family'
        ],
        required: true,
        default: 'supervisor'
    },

    academy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: function() {
            return this.role !== 'super_admin';
        }
    },

    is_active: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('User', UserSchema);