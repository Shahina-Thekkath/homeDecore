import mongoose from "mongoose";

const addressSchema = mongoose.Schema({
  name: {
    type: String,
    require: true,
  },
  phone: {
    type: Number,
    require: true,
  },
  pincode: {
    type: Number,
    required: true,
  },
  locality: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: false,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    enum: ["Assam", "Utter Pradesh", "Kerala", "Tamil Nadu"], // Allowed states
    required: true,
  },
  landmark: {
    type: String,
    required: false,
  },
  country: {
    type: String,
    enum: ["uae", "uk", "us", "india", "pakistan"], // Enum values
    required: true,
  },
  alternatePhone: {
    type: Number,
    required: false,
  },
  addressType: {
    type: String,
    enum: ["home", "work"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default addressSchema;
