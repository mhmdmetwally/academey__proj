const mongoose = require('mongoose');

const SupervisorSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    academy_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    is_active: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

SupervisorSchema.index(
    {
        user: 1,
        academy_id: 1
    },
    {
        unique: true
    }
);

module.exports =
    mongoose.model(
        'Supervisor',
        SupervisorSchema
    );