const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    expiresOn: {
        type: Date,
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        required: true
    },
    discountAmount: {
        type: Number,
        required: true
    },
    usageLimit: {
        type: Number,
        required: true
    },
    usedCount: {
        type: Number,
        default: 0
    },
    minPurchaseAmount: {
        type: Number,
        required: true
    },
    isActive: { type: Boolean, default: true },
    status: {
    type: Boolean,
    default: true         // true = active, false = deactivated
  }
}, {
    timestamps: true
});

module.exports = mongoose.model("Coupon", couponSchema);
