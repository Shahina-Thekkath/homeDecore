const mongoose = require("mongoose");
const { Schema } = mongoose;
const { model } = mongoose;
const { Types } = mongoose;

const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  isBlocked:{ type:Boolean, default:false},
categoryOffer: { type: Types.ObjectId, ref: "CategoryOffer", default: null },
  

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Category = model("Category", CategorySchema);
module.exports = Category;
