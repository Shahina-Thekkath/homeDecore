import mongoose from "mongoose";

const productOfferSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ProductOffer", productOfferSchema);
