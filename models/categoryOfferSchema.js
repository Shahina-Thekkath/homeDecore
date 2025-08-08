const mongoose = require("mongoose");

const categoryOfferSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
    unique: true // One offer per category
  },
  discountType: {
    type: String,
    enum: ["flat", "percentage"],
    required: true
  },
  discountAmount: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("CategoryOffer", categoryOfferSchema);
