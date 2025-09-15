const mongoose = require("mongoose");
const { Schema } = mongoose;
const { model } = mongoose;


const CartSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [
        {
            productId: { type: Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }, // Original price (without offer)
            discountAmount: { type: Number, default: 0 }, // Discount amount applied
            discountedPrice: { type: Number } // Final price after discount, if no discount the normal price without discount is saved
        }
    ],
    createdAt: { type: Date, default: Date.now }
   });

   const Cart = model('Cart', CartSchema);
   module.exports = Cart;