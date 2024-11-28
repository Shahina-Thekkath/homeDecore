const mongoose = require("mongoose");
const {Schema} = mongoose;
const {model} = mongoose;

const wishlistSchema = new Schema({
    UserId:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    products:[{
        productId:{
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        addedOn:{
            type: Date,
            default: Date.now
        }
    }]
})

const Wishlist = model('Wishlist',wishlistSchema);
module.exports = Wishlist;
