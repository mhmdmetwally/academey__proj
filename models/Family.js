const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({

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

}, {
    timestamps: true
});


// =====================================================
// Unique Name + Phone
// =====================================================

FamilySchema.index(
    {
        name: 1,
        phone: 1
    },
    {
        unique: true
    }
);


module.exports =
mongoose.model('Family', FamilySchema);