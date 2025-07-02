const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;


const walletSchema = new Schema({
    userId: {type: Types.ObjectId, ref: 'User'},
    balance: {type: Number, default: 0},
    transactions: [
        {
            type:{
            type: String,
            enum: ['credit', 'debit']
        },
        amount: Number,
        reason: String,
        date: {type: Date, default: Date.now }
            
       }
    ]
});

const Wallet = model('Wallet', walletSchema);
module.exports = Wallet;