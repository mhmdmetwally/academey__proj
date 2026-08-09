const mongoose = require('mongoose');


// =====================================================
// Invoice Item
// =====================================================

const InvoiceItemSchema =
    new mongoose.Schema(
        {
            // =========================================
            // الطالب داخل الأكاديمية
            // =========================================

            student_assignment: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'StudentAssignment',
                required: true
            },

            // =========================================
            // مادة الطالب
            // =========================================

            student_subject: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'StudentSubject',
                required: true
            },

            // =========================================
            // الحصص التي دخلت في الفاتورة
            // =========================================

            lessons: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Lesson'
                }
            ],

            // =========================================
            // عدد الحصص
            // =========================================

            lessons_count: {
                type: Number,
                required: true,
                min: 0
            },

            // =========================================
            // إجمالي الدقائق
            // =========================================

            total_minutes: {
                type: Number,
                required: true,
                min: 0
            },

            // =========================================
            // إجمالي الساعات
            //
            // مثال:
            // 80 دقيقة = 1.333333 ساعة
            // =========================================

            billing_hours: {
                type: Number,
                required: true,
                min: 0
            },

            // =========================================
            // سعر الساعة وقت إنشاء الفاتورة
            //
            // Snapshot
            // =========================================

            price_per_lesson: {
                type: Number,
                required: true,
                min: 0
            },

            // =========================================
            // إجمالي البند
            // =========================================

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
            // =========================================
            // الأكاديمية
            // =========================================

            academy_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Academy',
                required: true
            },

            // =========================================
            // الأسرة
            // =========================================

            family: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },

            // =========================================
            // بنود الفاتورة
            // =========================================

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

            // =========================================
            // إجمالي الفاتورة
            // =========================================

            total_amount: {
                type: Number,
                required: true,
                min: 0
            },

            // =========================================
            // المدفوع
            // =========================================

            paid_amount: {
                type: Number,
                default: 0,
                min: 0
            },

            // =========================================
            // المتبقي
            // =========================================

            remaining_amount: {
                type: Number,
                required: true,
                min: 0
            },

            // =========================================
            // الحالة
            // =========================================

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

            // =========================================
            // الشهر
            //
            // YYYY-MM
            // =========================================

            billing_month: {
                type: String,

                required: true,

                match:
                    /^\d{4}-(0[1-9]|1[0-2])$/
            },

            // =========================================
            // تاريخ الفاتورة
            // =========================================

            invoice_date: {
                type: Date,
                default: Date.now
            },

            // =========================================
            // ملاحظات
            // =========================================

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