const mongoose = require("mongoose");
const { Schema } = mongoose;
const { model } = mongoose;

const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  isBlocked:{ type:Boolean, default:false},
  

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Category = model("Category", CategorySchema);
module.exports = Category;
