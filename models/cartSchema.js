const mongoose = require("mongoose");
const { Schema } = mongoose;
const { model } = mongoose;


const CartSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User'},
    items:[
        {
            productId: {type: Schema.Types.ObjectId, ref: 'Product'},
            quantity: Number,
            price: Number
        }
    ],
    createdAt: {type: Date, default: Date.now}
   });

   const Cart = model('Cart', CartSchema);
   module.exports = Cart;