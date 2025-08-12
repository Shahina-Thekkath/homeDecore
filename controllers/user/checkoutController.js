const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    console.log("cart", cart);
    console.log("cart2", cart.items[0].productId._id);

    const user = await User.findById(userId);
    //    const coupons = await Coupon.find({
    //         expiresOn: { $gte: new Date() },
    //         usageLimit: { $gt: 0 },
    //         usersUsed: { $ne: userId }, // Exclude already used
    //     });

    const allCoupons = await Coupon.find();

    console.log("all coupons", allCoupons);
    

    const validCoupons = allCoupons.filter((coupon) => 
      new Date(coupon.expiresOn) >= new Date() &&
        coupon.usageLimit > 0 &&
        !coupon.usersUsed.includes(userId)
    );
    console.log("valid coupons", validCoupons);
    

    const flatCoupons = validCoupons.filter(
      (coupon) => coupon.discountType === "flat"
    );
    console.log("flat coupons", flatCoupons);
    
    const percentageCoupons = validCoupons.filter(
      (coupon) => coupon.discountType === "percentage"
    );
    console.log("percentage coupons",percentageCoupons);
    

    const expiredCoupons = allCoupons.filter(
      (coupon) =>
        new Date(coupon.expiresOn) < new Date() ||
        coupon.usageLimit <= 0 ||
        coupon.usersUsed.includes(userId)
    );
console.log("expired coupons", expiredCoupons);



    const cartItems = cart && cart.items && cart.items.length > 0
                ? cart.items.map((item) => {
                  const priceToUse = item.discountAmount && item.discountAmount > 0 ? item.discountedPrice : item.price;
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
      discountAmount = req.session.coupon.discount || 0;
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
      discountAmount,
      cartItems,
      grandTotal,
      addresses: user.addresses,
      selectedAddress,
      flatCoupons,
      expiredCoupons,
      percentageCoupons,
      coupons: allCoupons || []
    });
  } catch (error) {
    console.error("Error loading checkout page", error);
  }
};

const saveSelectedAddress = async (req, res) => {
  try {
    const userId = req.session.user._id; // Get user ID from session
    const { selectedAddress } = req.body; // Extract selected address ID from request body

    if (!selectedAddress) {
      return res.status(400).json({ message: "No address selected" });
    }

    // Find the user and update the default address
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Set the selected address as the default or handle it as required
    user.defaultAddress = selectedAddress; // Assuming you have a `defaultAddress` field
    await user.save();

    res.status(200).json({ message: "Address saved successfully" });
  } catch (error) {
    console.error("Error saving selected address:", error);
    res
      .status(500)
      .json({ message: "An error occurred while saving the address" });
  }
};

module.exports = { loadCheckout, saveSelectedAddress };
