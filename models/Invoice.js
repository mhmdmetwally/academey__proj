const mongoose =
    require('mongoose');


// =====================================================
// Invoice Item
// =====================================================

const InvoiceItemSchema =
    new mongoose.Schema(

        {

            student_assignment: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'StudentAssignment',
                required: true
            },

            student_subject: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'StudentSubject',
                required: true
            },

            lessons_count: {
                type: Number,
                required: true,
                min: 0
            },

            // Snapshot
            price_per_lesson: {
                type: Number,
                required: true,
                min: 0
            },

            total: {
                type: Number,
                required: true,
                min: 0
            }

        },

        {
            _id: true
        }

    );


// =====================================================
// Invoice
// =====================================================

const InvoiceSchema =
    new mongoose.Schema(

        {

            academy_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Academy',
                required: true
            },


            family: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },


            items: {
                type: [InvoiceItemSchema],

                required: true,

                validate: {

                    validator: function (value) {

                        return value.length > 0;

                    },

                    message:
                        'invoice must contain at least one item'

                }
            },


            total_amount: {
                type: Number,
                required: true,
                min: 0
            },


            paid_amount: {
                type: Number,
                default: 0,
                min: 0
            },


            remaining_amount: {
                type: Number,
                required: true,
                min: 0
            },


            status: {
                type: String,

                enum: [
                    'unpaid',
                    'partially_paid',
                    'paid',
                    'cancelled'
                ],

                default: 'unpaid'
            },


            billing_month: {
                type: String,
                required: true,

                match:
                    /^\d{4}-(0[1-9]|1[0-2])$/
            },


            invoice_date: {
                type: Date,
                default: Date.now
            },


            notes: {
                type: String,
                trim: true
            }

        },

        {
            timestamps: true
        }

    );


// =====================================================
// Indexes
// =====================================================

InvoiceSchema.index({
    academy_id: 1,
    family: 1
});


InvoiceSchema.index({
    academy_id: 1,
    billing_month: 1
});


InvoiceSchema.index({
    academy_id: 1,
    family: 1,
    billing_month: 1
});


module.exports =
    mongoose.model(
        'Invoice',
        InvoiceSchema
    );