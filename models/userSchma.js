const mongoose = require("mongoose");
const {Schema} = mongoose;

const addressSchema = require('../models/addressSchema');


const UserSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique: true, 
        default: null
    },

    phone:{
        type:String,
        required:false,
        sparse: true,


    },
    password:{
        type:String,
        required:false
    },
    
    token:{
        type:String,
        default:''
    },
    is_admin:{
        type:Boolean,
        default: false
        // required:true
    },
    isBlocked:{
        type:Boolean,
        default:false 
    },
    gender:{
        type:String,
        enum:['male','female'],
        
    },
    addresses:[addressSchema],
    wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    createdAt: {
        type: Date,
        default: Date.now
    }
  }],
    walletId: {
        type: mongoose.Schema.Types.ObjectId,
         ref: "wallet"},
        createdAt: {
            type:Date, 
           default: Date.now
        }      
    });

    module.exports = mongoose.model('User', UserSchema);