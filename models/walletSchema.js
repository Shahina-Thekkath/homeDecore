const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;


const walletSchema = new Schema({
    userId: {type: Types.ObjectId, ref: 'User'},
    balance: {type: Number, default: 0},
    transactions: [
        {
            transactionId: {
                type: String, // Generated unique ID (e.g., "TXN202508110001")
                required: true
            },
            type:{
            type: String,
            enum: ['credit', 'debit', 'refund']
        },
        amount: Number,
        reason: String,
        date: {type: Date, default: Date.now }
            
       }
    ]
});

const Wallet = model('Wallet', walletSchema);
module.exports = Wallet;