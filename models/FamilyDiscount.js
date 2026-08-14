const mongoose = require('mongoose');


// =====================================================
// Family Discount
// =====================================================

const FamilyDiscountSchema =
    new mongoose.Schema(
        {
            // =========================================
            // Academy
            // =========================================

            academy_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Academy',
                required: true,
                index: true
            },


            // =========================================
            // Family
            // =========================================

            family: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Family',
                required: true,
                index: true
            },


            // =========================================
            // Billing Month
            //
            // YYYY-MM
            //
            // Example:
            // 2026-08
            // =========================================

            billing_month: {
                type: String,

                required: true,

                match:
                    /^\d{4}-(0[1-9]|1[0-2])$/,

                index: true
            },


            // =========================================
            // Discount Percentage
            //
            // Example:
            // 10 = 10%
            // 25 = 25%
            // =========================================

            percentage: {
                type: Number,

                required: true,

                min: 0.01,

                max: 100
            },


            // =========================================
            // Reason
            //
            // سبب الخصم
            // =========================================

            note: {
                type: String,

                required: true,

                trim: true,

                maxlength: 500
            },


            // =========================================
            // Status
            // =========================================

            status: {
                type: String,

                enum: [
                    'active',
                    'cancelled'
                ],

                default: 'active',

                index: true
            }
        },

        {
            timestamps: true
        }
    );


// =====================================================
// Indexes
// =====================================================

FamilyDiscountSchema.index({
    academy_id: 1,
    family: 1,
    billing_month: 1
});


FamilyDiscountSchema.index({
    academy_id: 1,
    family: 1,
    billing_month: 1,
    status: 1
});


module.exports =
    mongoose.model(
        'FamilyDiscount',
        FamilyDiscountSchema
    );