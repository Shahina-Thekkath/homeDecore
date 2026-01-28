import express from "express";

const userRouter = express.Router();

// import logger from '../utils/logger.js';

import homeController from "../controllers/user/homeController.js";
import load404Controller from "../controllers/user/404Controller.js";
import signupController from "../controllers/user/signupController.js";
import loginController from "../controllers/user/loginController.js";
import passport from "../config/passport.js";
import auth from "../middleware/userAuth.js";
import logoutController from "../controllers/user/logoutController.js";
import productController from "../controllers/user/productController.js";
import profileController from "../controllers/user/profileController.js";
import addressController from "../controllers/user/addressController.js";
import cartController from "../controllers/user/cartController.js";
import checkoutController from "../controllers/user/checkoutController.js";
import orderController from "../controllers/user/orderController.js";
import couponController from "../controllers/user/couponController.js";
import wishlistController from "../controllers/user/wishlistController.js";
import walletController from "../controllers/user/walletController.js";
import ensureCartNotEmpty from "../middleware/ensureCartNotEmpty.js";

// const GoogleStrategy = require('passport-google-oauth20').Strategy;

userRouter.get("/pageNotFound", load404Controller.pageNotFound);
userRouter.get("/", homeController.loadHomepage);
userRouter.get("/signup", auth.isLogout, signupController.loadSignup);
userRouter.get("/login", auth.isLogout, loginController.loadLogin);
userRouter.post("/login", auth.isLogout, loginController.login);
userRouter.post("/signup", auth.isLogout, signupController.signup);
userRouter.get("/verify-otp", auth.isLogout, signupController.getVerifyOtp);
userRouter.post("/verify-otp", auth.isLogout, signupController.verifyOtp);
userRouter.post("/resend-otp", signupController.resendOtp);
userRouter.get("/logout", auth.isLogin, logoutController.logout);

userRouter.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);

userRouter.get(
  "/forgotPassword",
  auth.isLogout,
  signupController.forgotPassword
);
userRouter.post(
  "/forgotPassword",
  auth.isLogout,
  signupController.forgotVerify
);
userRouter.get(
  "/resetPassword",
  auth.isLogout,
  signupController.resetPasswordLoad
);
userRouter.post(
  "/resetPassword",
  auth.isLogout,
  signupController.verifyResetPassword
);
userRouter.get(
  "/changePassword",
  auth.isLogin,
  signupController.changePassword
);
userRouter.post("/changePassword", auth.isLogin, signupController.changeVerify);

userRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/success",
    failureRedirect: "/failure",
  })
);

userRouter.get("/success", signupController.successGoogleLogin);
userRouter.get("/failure", signupController.failureGoogleLogin);

userRouter.get("/product-details/:id", productController.loadProductDetails);
userRouter.get("/productList", productController.getUserProductList);
userRouter.get(
  "/user/products/filter",
  productController.getFilteredProductList
); //changed auth.isLogin here

userRouter.get("/profile", auth.isLogin, profileController.userProfile);
userRouter.get(
  "/updateProfile",
  auth.isLogin,
  profileController.getEditProfile
);
userRouter.post(
  "/updateProfile",
  auth.isLogin,
  profileController.updateProfile
);

userRouter.get("/address", auth.isLogin, addressController.getAddress);
userRouter.get("/addAddress", auth.isLogin, addressController.loadAddAddress);
userRouter.post("/addAddress", auth.isLogin, addressController.addAddress);
userRouter.get(
  "/editAddress/:addressId",
  auth.isLogin,
  addressController.loadEditAddress
);
userRouter.put(
  "/editAddress/:addressId",
  auth.isLogin,
  addressController.editAddress
);
userRouter.delete(
  "/deleteAddress/:id",
  auth.isLogin,
  addressController.deleteAddress
);

userRouter.post("/add-to-cart", auth.sessionVerify, cartController.addToCart);
userRouter.post("/cart/update", auth.isLogin, cartController.updateCartTotals);
userRouter.get("/cart", auth.sessionVerify, cartController.loadCart);
userRouter.delete(
  "/deleteCartItem/:id",
  auth.sessionVerify,
  cartController.deleteCartItem
);
userRouter.post(
  "/updateCartTotals",
  auth.sessionVerify,
  cartController.updateCartTotals
);

userRouter.get(
  "/checkout",
  auth.sessionVerify,
  ensureCartNotEmpty,
  checkoutController.loadCheckout
);
userRouter.post(
  "/saveSelectedAddress",
  auth.sessionVerify,
  checkoutController.saveSelectedAddress
);
userRouter.post(
  "/calculate-delivery-charge",
  auth.sessionVerify,
  orderController.calculateDeliveryCharge
);

userRouter.post(
  "/create-razorpay-order",
  auth.sessionVerify,
  orderController.createRazorpayOrder
);
userRouter.post(
  "/verify-razorpay-payment",
  auth.sessionVerify,
  orderController.verifyRazorpayPayment
);

userRouter.get(
  "/order-success",
  auth.sessionVerify,
  orderController.getOrderSuccess
);
userRouter.post(
  "/order-save",
  auth.sessionVerify,
  orderController.saveOrderInSession
);
userRouter.get("/orders", auth.sessionVerify, orderController.getOrdersPage);
userRouter.get(
  "/orderDetails/:orderId",
  auth.sessionVerify,
  orderController.getOrderDetails
);
userRouter.patch(
  "/order/:orderId/cancel/:productId",
  auth.sessionVerify,
  orderController.cancelOrder
);
userRouter.post(
  "/order/return/:orderId/:productId",
  auth.sessionVerify,
  orderController.returnOrder
);

userRouter.post(
  "/razorpay-payment-failed",
  auth.sessionVerify,
  orderController.razorPaymentFailed
);
userRouter.get(
  "/payment-failed",
  auth.sessionVerify,
  orderController.getOrderFailurePage
);
userRouter.post(
  "/retry-payment/:orderId",
  auth.sessionVerify,
  orderController.retryPayment
);
userRouter.post(
  "/retry/razorpay-payment-failed",
  auth.sessionVerify,
  orderController.retryRazorPaymentFailed
);
userRouter.get(
  "/retry/payment-failed",
  auth.sessionVerify,
  orderController.getRetryRazorpayFailurePage
);

userRouter.post(
  "/apply-coupon",
  auth.sessionVerify,
  couponController.applyCoupon
);
userRouter.post(
  "/remove-coupon",
  auth.sessionVerify,
  couponController.removeCoupon
);

userRouter.get("/wishlist", auth.sessionVerify, wishlistController.getWishlist);
userRouter.post(
  "/add-to-wishlist",
  auth.sessionVerify,
  wishlistController.addToWishlist
);
userRouter.delete(
  "/wishlist/clear",
  auth.sessionVerify,
  wishlistController.clearWishlist
);
userRouter.delete(
  "/wishlist/remove/:id",
  auth.sessionVerify,
  wishlistController.removeProductFromWishlist
);
userRouter.get(
  "/wishlist/empty",
  auth.sessionVerify,
  wishlistController.getEmptyWishlist
);
userRouter.get(
  "/check-wishlist/:productId",
  auth.sessionVerify,
  wishlistController.checkWishlist
);

userRouter.get("/wallet", auth.sessionVerify, walletController.getWallet);
userRouter.post(
  "/wallet-order",
  auth.sessionVerify,
  orderController.saveWalletOrder
);

export default userRouter;
