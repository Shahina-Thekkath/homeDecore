const mongoose = require('mongoose');
const {Schema} = mongoose;
const {model} = mongoose;
const { Types } = mongoose;


const OfferSchema = new Schema({
    name: {type: String, required: true},
    discount: {type: Number, required: true},
    type:{type:String, enum: [ 'product', 'category']},
    expiryDate: Date,
    applicableId: [{ type: Types.ObjectId}],
    createdAt: { type: Date, default: Date.now}
 });

 const Offer = model('Offer', OfferSchema);
 module.exports = Offer;