const mongoose = require('mongoose');

const PaymentAllocationSchema = new mongoose.Schema(
    {
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
            required: true
        },

        invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01
        }
    },
    {
        timestamps: true
    }
);


PaymentAllocationSchema.index({
    payment: 1
});


PaymentAllocationSchema.index({
    invoice: 1
});


module.exports =
    mongoose.model(
        'PaymentAllocation',
        PaymentAllocationSchema
    );