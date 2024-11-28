

        // Wallet

const WalletSchema = new Schema({
    userId: { 
        type: Types.ObjectId, 
        ref: 'User',
        unique: true},

        balance: {
        type: Number,
        default: 0
        },

        transactions: [
    
       {
          amount: Number,
          date: {
            type: Date, 
            default: Date.now},
            description: String,
            type: {
                type: String, 
                enum:['credit','debit']
            }
        }],

        creditedAt: {
            type: Date,
            default: Date.now
        }
    });

   

    

   
   
   const OrderSchema = new Schema({
    userId: { type: Types.ObjectId, ref: 'User', required: true},
    OrderNumber: String,
    offerDeicsount: Number,
    itemOrdred:[
        {
            price: Number,
            productId: {type: Types.ObjectId, ref: 'Product'},
            ProductName: String,
            quantity: Number

        }
    ],
    subtotal: Number,
    status: {type: String, enum: ['processing', 'delivered', 'shipped']},
    paymentMethod: String,
    retunReason:[{
        message: String,
        reason: String
    }],
    actualMrp: Number, 
    aouponDescount:
    Number,
    totalAmount: Number,
    estimatedDelivery: Date,
    shippingAddress: {
        addressLine: String,
        city: String,
        state: String,
        zipcode: String
    },
    createdAt: {type: Date, default: Date.now}
   });
    
   const Order = model('Order', OrderSchema);
   module.exports = Order;

   const WishlistSchema = new Schema({
    userId: {type: Types.ObjectId, ref: 'User', unique: true},
    products: [{type: Types.ObjectId, ref: 'Product'}]
   });

   const Wishlist = model('Wishlist', WishlistSchema);
   module.exports = Wishlist;

   const CartSchema = new Schema({
    userId: { type: Types.ObjectId, ref: 'User'},
    items:[
        {
            productId: {type: Types.ObjectId, ref: 'Product'},
            quantity: Number,
            price: Number
        }
    ],
    createdAt: {type: Date, default: Date.now}
   });

   const Cart = model('Cart', CartSchema);
   module.exports = Cart;

   const OfferSchema = new Schema({
      name: {type: String, required: true},
      discount: {type: Number, required: true},
      type:{type:String, enum: [ 'product', 'category']},
      expiryDate: Date,
      applicableId: [{ type: Types.ObjectId}],
      createdAt: { type: Date, default: Date.now}
   });
   const Offer = model('offers', OfferSchema);
   module.exports = Offer;

   const CouponSchema = new Schema({
    code:{type: String, required: true, unique: true},
    expiryDate: Date,
    discount: Number,
    minPurchaseAmt: Number,
    createdAt: {type: Date, default: Date.now}
   });

   const Coupon = model('Coupons', CouponSchema);
   module.exports = Coupon;

   const AdminSchema = new Schema({
    name: { type: String, required: true},
    password: { type: String, required: true},
    status: String
   });

   const Admin = model('Admin', AdminSchema);
   module.exports = Admin;


