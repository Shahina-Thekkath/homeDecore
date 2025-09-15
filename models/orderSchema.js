const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const OrderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true }, // Reference to the user placing the order
    products: [
      {
        productId: { type: Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Price per product at the time of the order
        discountedPrice: { type: Number, required: true },
        status: {
          type: String,
          enum: [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Return Requested",
            "Returned",
          ],
          default: "Processing",
        },
        deliveredAt: { type: Date },
        cancellationReason: { type: String, default: null },  // reason for cancellation
        returnReason: { type: String, default: null },  // reason for return
      },
    ],
    totalAmount: { type: Number, required: true }, // Total amount for the order
    shippingAddress: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      locality: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: [
        "Cash on Delivery",
        "Credit/Debit Card",
        "Razorpay",
        "Bank Transfer",
      ],
      required: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Return Requested",
        "Returned",
        "Completed"
      ],
      default: "Processing",
    },
    isPaid: { type: Boolean, default: false }, // COD orders will have this as false initially
    paymentDetails: {
      // Optional field for payment confirmation
      transactionId: { type: String },
      paymentDate: { type: Date },

      // Razorpay-specific additions
      razorpayOrderId: { type: String }, // Razorpay Order ID (returned after order creation)
      razorpayPaymentId: { type: String }, // Razorpay Payment ID (returned after payment)
      razorpaySignature: { type: String }, // Used to verify the payment authenticity
    },
    discountAmount: {
      type: Number,
      default: 0,
    },                    // this is the amount in rs whether percent or flat , offerDiscount
    couponCode: {
      type: String,
      default: null,
    },
    couponDiscount: { type: Number, default: 0 }                                            
  },
  { timestamps: true }
);

const Order = model("Order", OrderSchema);
module.exports = Order;
