const mongoose = require("mongoose");
const { Schema } = mongoose;
const { model } = mongoose;
const { Types } = mongoose;

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    stock: { type: Number, default: 0 },
    price: { type: Number, required: true },
    categoryId: { type: Types.ObjectId, ref: "Category", required: true },
   
    // salePrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: [String],
    rating: { type: Number, default: 0 },
    discounts: { type: String, default: null },
    reviews: [
      {
        users: { type: Types.ObjectId, ref: "User", required: true },
        comment: { type: String, required: true },
        rating: { type: Number, required: true, min: 0, max: 5 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, required: true, default: 0 },
    relatedProducts: [{ type: Types.ObjectId, ref: "Product" }],
    isBlocked: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Available", "Out of stock", "Discontinued"],
    },
    productOffer: { type: Types.ObjectId, ref: "offer" },
  },
  { timestamps: true }
);

const Product = model("Product", ProductSchema);
module.exports = Product;
