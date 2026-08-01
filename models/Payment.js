const PaymentSchema = new mongoose.Schema({

    academy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Academy',
        required: true
    },

    family: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    amount: {
        type: Number,
        required: true,
        min: 0
    },

    allocations: [{
        bill: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bill',
            required: true
        },

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        }
    }],

    payment_method: {
        type: String,
        enum: [
            'cash',
            'bank_transfer',
            'online'
        ],
        default: 'cash'
    },

    payment_date: {
        type: Date,
        default: Date.now
    },

    notes: String

}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', PaymentSchema);