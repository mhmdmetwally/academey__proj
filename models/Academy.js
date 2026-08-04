const mongoose = require('mongoose');
const validator = require('validator');

const AcademySchema = new mongoose.Schema({

    academy_name: {
        type: String,
        required: true,
        trim: true,

        validate: [
            (value) =>
                validator.isLength(
                    value,
                    {
                        min: 3,
                        max: 100
                    }
                ),

            "اسم الأكاديمية على الأقل 3 أحرف وعلى الأكثر 100"
        ]
    },


    manager_phone: {
        type: String,
        required: true,
        trim: true
    },


    manager_name: {
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


    academy_code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },


    password: {
        type: String,
        required: true
    },


    is_active: {
        type: Boolean,
        default: false
    },


    subscription_period: {
        type: Date,
        default: null
    },


    finance: {

        total_revenue: {
            type: Number,
            default: 0,
            min: 0
        },

        total_expenses: {
            type: Number,
            default: 0,
            min: 0
        }

    }

}, {
    timestamps: true
});


module.exports =
    mongoose.model('Academy', AcademySchema);

