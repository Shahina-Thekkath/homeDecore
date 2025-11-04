const mongoose = require("mongoose");
const { Schema } = mongoose;
const { model } = mongoose;
const { Types } = mongoose;

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    categoryId: { type: Types.ObjectId, ref: "Category", required: true },
   

    quantity: { type: Number, required: true },
    image: [
            {
              public_id: { type: String },
              url: { type: String }
            }
          ],
     specification: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true }
      }
    ],
    rating: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    discounts: { type: String, default: null },
    productOffer: { type: Types.ObjectId, ref: "ProductOffer", default: null },
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
    }
  },
  { timestamps: true }
);

// ProductSchema.index({ price: 1 });
// ProductSchema.index({ averageRating: -1 });
ProductSchema.index({ name: 1, unique: true});
// ProductSchema.index({ isFeatured: 1 });


const Product = model("Product", ProductSchema);
module.exports = Product;