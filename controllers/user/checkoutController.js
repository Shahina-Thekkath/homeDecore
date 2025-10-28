const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const { STATUS_CODES, MESSAGES } = require("../../constants");

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.passport._id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    const user = await User.findById(userId);

    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = await Wallet.create({ 
        userId, 
        balance: 0,
        transactions: [] 
      });
    }

    const allCoupons = await Coupon.find();

    const validCoupons = allCoupons.filter((coupon) => 
      new Date(coupon.expiresOn) >= new Date() &&
        coupon.usageLimit > 0 &&
        !coupon.usersUsed.includes(userId)
    );
   
    const flatCoupons = validCoupons.filter(
      (coupon) => coupon.discountType === "flat"
    );
    
    const percentageCoupons = validCoupons.filter(
      (coupon) => coupon.discountType === "percentage"
    );
   
    const expiredCoupons = allCoupons.filter(
      (coupon) =>
        new Date(coupon.expiresOn) < new Date() ||
        coupon.usageLimit <= 0 ||
        coupon.usersUsed.includes(userId)
    );




    const cartItems = cart && cart.items && cart.items.length > 0
                ? cart.items.map((item) => {
                  const priceToUse =  item.discountedPrice;
                  return {
                    _id: item._id,
                    productId: item.productId,
                    name: item.productId.name,
                    price: item.price,
                    discountedPrice: item.discountedPrice,
                    quantity: item.quantity,
                    subtotal: priceToUse * item.quantity
                }
            }) : [];

    const grandTotal = cartItems.reduce(
      (total, item) => total + item.subtotal,
      0
    );

    let discountAmount = 0;

    if(req.session.coupon){
      discountAmount = req.session.coupon.discount || 0;   // coupon discount
      
    }

    // Use the default address or fallback to the first address
    let selectedAddress = null;
    if (user.addresses && user.addresses.length > 0) {
      selectedAddress =
        (user.defaultAddress &&
          user.addresses.find(
            (address) =>
              address._id.toString() === user.defaultAddress.toString()
          )) ||
        user.addresses[0];
    }
 
    

    res.render("checkout", {
      user,
      discountAmount,   // here the discountAmount is coupon discount
      cartItems,
      grandTotal,
      addresses: user.addresses,
      selectedAddress,
      flatCoupons,
      expiredCoupons,
      percentageCoupons,
      coupons: allCoupons || [],
      walletBalance: wallet.balance
    });
  } catch (error) {
    console.error("Error loading checkout page", error);
  }
};

const saveSelectedAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.passport._id; // Get user ID from session
    const { selectedAddress } = req.body; // Extract selected address ID from request body

    if (!selectedAddress) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.CHECKOUT.NO_ADDRESS_SELECTED });
    }

    // Find the user and update the default address
    const user = await User.findById(userId);
    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.USER.NOT_FOUND });
    }

    // Set the selected address as the default or handle it as required
    user.defaultAddress = selectedAddress; // Assuming you have a `defaultAddress` field
    await user.save();

    res.status(STATUS_CODES.OK).json({ message: MESSAGES.CHECKOUT.ADDRESS_SAVED });
  } catch (error) {
    console.error("Error saving selected address:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.CHECKOUT.ADDRESS_SAVE_FAILED });
  }
};

module.exports = { loadCheckout, saveSelectedAddress };
