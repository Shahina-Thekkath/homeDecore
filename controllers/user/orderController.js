const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");
const razorpay = require("../../config/razorpayInstance");
const crypto = require("crypto");
const qs = require("qs");
const Coupon = require("../../models/couponSchema");
const { log } = require("console");
const Wallet = require('../../models/walletSchema');
const axios = require("axios");
const dotenv = require("dotenv");
const { doesNotThrow } = require("assert");
const { STATUS_CODES, MESSAGES } = require('../../constants');
dotenv.config();

const WAREHOUSE_CITY = process.env.WAREHOUSE_CITY;
const ORS_API_KEY = process.env.ORS_API_KEY;

async function getCoordinates(city) {
   const url = `https://api.openrouteservice.org/geocode/search`;
   try {
    const { data } = await axios.get(url, {
      params: { api_key: ORS_API_KEY, text: ` ${city}, Kerala, India`, 'boundary.country': 'IN' }
    });

    if (!data.features || data.features.length === 0) {
        throw new Error('No coordinates found for this city.');
    }

    return data.features[0].geometry.coordinates; // or swap for [lat, lng]
} catch (err) {
    console.error(`Failed to fetch coordinates for city ${city}:`, err.message);
    throw err;
}
}
 
// Calculate delivery charge

const calculateDeliveryCharge = async (req, res) => {
  try {
    const { city } = req.body;

    if(!city) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.ADDRESS.CITY_REQUIRED });
    }

    const warehouseCoords = await getCoordinates(WAREHOUSE_CITY);
    const userCoords = await getCoordinates(city);


    const matrixRes = await axios.post(
      `https://api.openrouteservice.org/v2/matrix/driving-car`,
      { locations: [warehouseCoords, userCoords],
        metrics: ['distance']
       },
      { headers: { Authorization: `Bearer ${ORS_API_KEY}`, 'Content-Type': 'application/json' } }

    );
    
    const distanceMeters = matrixRes.data.distances[0][1];
    const distanceKm = (distanceMeters / 1000).toFixed(2);

    let deliveryCharge = 0;
    if (distanceKm > 5) {
      deliveryCharge = Math.round((distanceKm - 5) * 1.5);
    }

    req.session.deliveryCharge = deliveryCharge;

    res.json({ success: true, distanceKm, deliveryCharge });
  } catch (error) {
    console.error('Delivery charge error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.DELIVERY.CALCULATE_FAILED });
    
  }
};

const saveOrderFromSerializedData = async (
  formData,
  userId,
  isPaid = false,
  couponCode = null,
  couponDiscount = 0,
  deliveryCharge = 0
) => {
  try {
    const parsedFormData = qs.parse(formData);

    const { cartItems, shippingAddress, payment, grandTotal } = parsedFormData;

    

    const orderItems = cartItems.map((item) => ({
      productId: item.id,
      name: item.name,
      price: parseFloat(item.price),
      discountedPrice: parseFloat(item.discountedPrice),
      quantity: parseInt(item.quantity),
      subtotal: parseFloat(item.subtotal),
    }));

    // Calculate offer discount (sum of original - discounted per product) 
      const offerDiscountTotal = orderItems.reduce((sum, item) => {
        return sum + (parseFloat(item.price) - parseFloat(item.discountedPrice)) * item.quantity;
      }, 0);

      const finalTotal = parseFloat(grandTotal) + parseFloat(deliveryCharge) - parseFloat(couponDiscount) || 0;   // the coupon discount is being reduced

    const newOrder = new Order({
      userId: userId,
      products: orderItems,
      shippingAddress,
      paymentMethod: payment,
      totalAmount: parseFloat(finalTotal),
      isPaid: true,
      createdAt: new Date(),
      discountAmount: parseFloat(offerDiscountTotal) || 0,
      deliveryCharge,
      couponCode: couponCode || null,
      couponDiscount: couponDiscount || 0
    });

    let savedOrder = await newOrder.save();

    if (!savedOrder || !savedOrder._id) {
      console.error("Order saving failed!");
      throw new Error("Order save failed");
    }

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
      });

      if (coupon) {
        // Prevent double-use by the same user
        if (!coupon.usersUsed.includes(userId)) {
          coupon.usersUsed.push(userId);
          coupon.usedCount += 1;
          await coupon.save();
        }
      }
    }

    //  Clear cart
    await Cart.deleteOne({ userId });

    return {
      userId: userId,
      products: orderItems,
      shippingAddress,
      paymentMethod: payment,
      totalAmount: parseFloat(finalTotal),
      deliveryCharge,
      isPaid: true,
      createdAt: new Date(),
      discountAmount: parseFloat(offerDiscountTotal) || 0,
      couponCode: couponCode || null,
      couponDiscount: couponDiscount || 0
    };
  } catch (error) {
    console.error("Error Deserializing:", error);
    throw error;
  }
};

// cash on delivery
const saveOrderInSession = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { cartItems, grandTotal, shippingAddress, payment } = req.body;   // here the grandTotal is the amount after the  discount is applied if any but in cartSchema the discountedPrice and price are stored seperately
    

    const itemsArray = Array.isArray(cartItems)
      ? cartItems
      : Object.values(cartItems);

      // Calculate offer discount (sum of original - discounted per product) 
      const offerDiscountTotal = itemsArray.reduce((sum, item) => {
        return sum + (parseFloat(item.price) - parseFloat(item.discountedPrice)) * item.quantity;
      }, 0);

      // coupon discount from session (if applied)
      const couponDiscount = req.session.coupon?.discount || 0;
      const deliveryCharge = req.session.deliveryCharge || 0;
      const finalTotal = parseFloat(grandTotal) + parseFloat(deliveryCharge) - parseFloat(couponDiscount);    // grandTotal <= checkout.ejs = #orderForm <= cartItems = checkoutController


    // Format the order details

    const order = {
      userId: req.session.user?._id || req.session.passport._id,

      products: itemsArray.map((item) => ({
        productId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        discountedPrice: parseFloat(item.discountedPrice),
        quantity: parseInt(item.quantity, 10),
        subtotal: parseFloat(item.subtotal),
      })),
      totalAmount: finalTotal,
      deliveryCharge,
      shippingAddress: shippingAddress, // Parse the selected address if passed as JSON
      paymentMethod: payment,
      createdAt: new Date(),
      discountAmount: parseFloat(offerDiscountTotal) || 0,  // req.session.coupon?.discount || 0;  ==> need to be checked
      couponCode: req.session.coupon?.code || null,
      couponDiscount: parseFloat(couponDiscount)
    };

    req.session.order = order;
    req.session.paymentMethod = "COD";

    const newOrder = new Order(order);
    await newOrder.save();

    // Decrement product stock
    for (const item of order.products) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
    }


    const couponCode = req.session.coupon?.code;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
      });

      if (coupon && !coupon.usersUsed.includes(userId)) {
        // Prevent double-use by the same user
        
          coupon.usersUsed.push(userId);
          coupon.usedCount += 1;
          await coupon.save();
        
      }
    }

    await Cart.findOneAndUpdate(
      { userId: req.session.user?._id || req.session.passport._id},
      { $set: { items: [] } }
    );

    // mark order as completed
    req.session.orderPlaced = true;

    return res.json({ success: true });
  } catch (error) {
    console.error("Error saving order in session:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ORDER.SAVE_FAILED });
  }
};

const getOrderSuccess = (req, res) => {
  try {
    // Check if order exists in session
    const order = req.session.order;

    const paymentMethod = req.session.paymentMethod;

    if (!order) {
      console.error("order success Error:", order);
      return res.redirect("/checkout"); // Redirect to checkout if no order in session
    }

    req.session.orderPlaced = true;
    req.session.checkoutInProgress = false;
    req.session.paymentAttempted = false;

    req.session.lastOrderFailed = false;

    req.session.order = null;
    req.session.paymentMethod = null;
    req.session.coupon = null;
    req.session.deliveryCharge = 0;

    const grandTotal = order.products.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);



    // Render the success page with order details
    res.render("orderSuccess", { order, paymentMethod, grandTotal });
  } catch (error) {
    console.error("Error displaying order success page:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.ORDER.SUCCESS_PAGE_FAILED);
  }
};

const saveWalletOrder = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { cartItems, grandTotal, shippingAddress, payment } = req.body;

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.WALLET.NOT_FOUND });

    const itemsArray = Array.isArray(cartItems) ? cartItems : Object.values(cartItems);

    const offerDiscountTotal = itemsArray.reduce((sum, item) => {
      return sum + (parseFloat(item.price) - parseFloat(item.discountedPrice)) * item.quantity;
    }, 0);

    const couponDiscount = req.session.coupon?.discount || 0;
    const deliveryCharge = req.session.deliveryCharge || 0;
    const finalTotal = parseFloat(grandTotal) + parseFloat(deliveryCharge) - parseFloat(couponDiscount);

    // Check wallet balance
    if (wallet.balance < finalTotal) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.WALLET.INSUFFICIENT_BALANCE });
    }

    // Deduct from wallet
    wallet.balance -= finalTotal;
    wallet.transactions.push({
      transactionId: `TXN${Date.now()}`,
      type: "debit",
      amount: finalTotal,
      reason: "Order Payment",
      date: new Date(),
    });
    await wallet.save();

    // Save order
    const order = {
      userId,
      products: itemsArray.map((item) => ({
        productId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        discountedPrice: parseFloat(item.discountedPrice),
        quantity: parseInt(item.quantity, 10),
        subtotal: parseFloat(item.subtotal),
      })),
      totalAmount: finalTotal,
      deliveryCharge,
      shippingAddress,
      paymentMethod: payment,
      createdAt: new Date(),
      discountAmount: parseFloat(offerDiscountTotal) || 0,
      couponCode: req.session.coupon?.code || null,
      couponDiscount: parseFloat(couponDiscount),
      isPaid: true
    };

    req.session.order = order;
    req.session.paymentMethod = payment;

    const newOrder = new Order(order);
    await newOrder.save();

    // Decrement stock
    for (const item of order.products) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
    }

    req.session.orderPlaced = true;
    req.session.checkoutInProgress = false;
    req.session.paymentAttempted = false;

    // Mark coupon as used
    const couponCode = req.session.coupon?.code;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
      if (coupon && !coupon.usersUsed.includes(userId)) {
        coupon.usersUsed.push(userId);
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    // Empty cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    // Clear session data
    req.session.order = order;
    req.session.paymentMethod = "Wallet Payment";

    res.json({ success: true });
  } catch (error) {
    console.error("Error processing wallet order:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.WALLET.PAYMENT_FAILED });
  }
};


const getOrdersPage = async (req, res) => {
  try {
    // User has acknowledged order — reset checkout flow
    delete req.session.orderPlaced;
    delete req.session.checkoutInProgress;
    delete req.session.paymentAttempted;

    const userId = req.session.user?._id || req.session.passport._id;

    const user = await User.findById(userId);
    const filter = req.query.filter || "all"; // Default to 'all' if no filter is selected
    const query = { userId };

    if (filter === "5") {
      query.createdAt = {
        $gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      }; // Last 5 days
    } else if (filter === "15") {
      query.createdAt = {
        $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      }; // Last 15 days
    } else if (filter === "30") {
      query.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      }; // Last 30 days
    } else if (filter === "180") {
      query.createdAt = {
        $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      }; // Last 6 months
    }

    //pagination

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("products.productId", "name image price");

    res.render("userOrder", { orders, user, filter, currentPage: page, totalPages });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.ORDER.LOAD_FAILED);
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.passport._id;
    const user = await User.findById(userId);
    const { orderId } = req.params;
    

    const order = await Order.findById(orderId)
      .populate("products.productId", "name image price")
      .lean(); // convert the mongoose document to plain js object for easier handling

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.ORDER.NOT_FOUND);
    }

    const grandTotal = order.products.reduce((acc, product) => {
      return acc + product.price * product.quantity;
    }, 0);

    order.products = order.products.map((product) => {
      return {
        ...product,
        originalProductId: product.productId._id,
        isCancellable: ["Pending", "Processing"].includes(product.status),
        isReturnable: product.status === "Delivered",
      };
    });

    res.render("manageOrder", {
      order,
      user,
      grandTotal,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.ORDER.DETAILS_LOAD_FAILED);
  }
};

const generateTransactionId = () => {
  const timestamp = Date.now().toString(); // current time in ms
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `TXN${timestamp}${randomPart}`;
};


const handleRefundToWallet = async (userId, amount, reason) => {
  const transactionId = generateTransactionId();
  const wallet = await Wallet.findOne({ userId });

  if (wallet) {
    // Ensure transactions array exists
    if (!Array.isArray(wallet.transactions)) {
      wallet.transactions = [];
    }

    wallet.balance += amount;
    wallet.transactions.push({
      transactionId,
      type: "credit",
      amount,
      reason,
      date: new Date()
    });

    await wallet.save();
    
  } else {
    await Wallet.create({
      userId,
      balance: amount,
      transactions: [
        {
          transactionId,
          type: "credit",
          amount,
          reason,
          date: new Date()
        },
      ],
    });
  }
};

function updateOverallOrderStatus(order) {
  const statuses = order.products.map(p => p.status);

  if (statuses.every(s => s === "Cancelled")) {
    order.orderStatus = "Cancelled";
  } else if (statuses.every(s => s === "Returned")) {
    order.orderStatus = "Returned";
  } else if (statuses.every(s => s === "Delivered")) {
    order.orderStatus = "Completed";
  } else if (statuses.includes("Processing") || statuses.includes("Shipped")) {
    order.orderStatus = "Processing";
  } else {
    order.orderStatus = "Pending";
  }

  return order.orderStatus;
}

     const calculateRefund = (order, product) => {
  // Total refunded so far
  const totalRefundedSoFar = order.products.reduce(
    (sum, p) => sum + (p.refundedAmount || 0),
    0
  );

  // Active (non-cancelled/returned) products
  const activeProducts = order.products.filter(
    (p) => !["Cancelled", "Returned"].includes(p.status)
  );

  let refundAmount;

  if (activeProducts.length === 1 && activeProducts[0]._id.equals(product._id)) {
    // Last product → refund remaining amount (actual paid)
    refundAmount = (order.totalAmount - totalRefundedSoFar) - order.deliveryCharge;
  } else {
    // Proportional refund from amount actually paid
    const subtotal = order.products.reduce(
      (sum, p) => sum + p.discountedPrice * p.quantity,
      0
    );
    const productPrice = product.discountedPrice * product.quantity;

    const totalWithoutDelivery = order.totalAmount - order.deliveryCharge;

    refundAmount = (productPrice / subtotal) * totalWithoutDelivery;
  }

  return refundAmount;
};


// cancel for a single product in an order
//here the product which has been cancelled, its stock is updated, amount is also refunded
const cancelOrder = async (req, res) => {
  const { orderId, productId } = req.params;
  const { reason } = req.body;

  try {
    const order = await Order.findById(orderId).populate("userId");
    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.NOT_FOUND });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );

    if (!product) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.PRODUCT_NOT_FOUND });
    }

    if (!["Pending", "Processing"].includes(product.status)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: `Cannot cancel a ${product.status.toLowerCase()} item`,
      });
    }

    if (product.status === "Cancelled") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Product already cancelled" });
    }

    // Enhanced cancellation reason validation
    const validationResult = validateOrderReason(reason, "cancel");
    if (!validationResult.isValid) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: validationResult.message,
      });
    }
    const cleanedReason = validationResult.cleanedReason;

    // Restore stock
    const dbProduct = await Product.findById(productId);
    if (dbProduct) {
      dbProduct.quantity += product.quantity;
      await dbProduct.save();
    }

    // Refund calculation
    const refundAmount = calculateRefund(order, product);
    product.refundedAmount = refundAmount;
    


    // Wallet refund for paid orders
    if (order.isPaid) {
      await handleRefundToWallet(
        order.userId._id,
        refundAmount,
        "Order Cancel Refund"
      );
    }

    product.status = "Cancelled";
    product.cancellationReason = cleanedReason;

    updateOverallOrderStatus(order);
    await order.save();

    return res.json({ success: true });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.ORDER.CANCEL_FAILED });
  }
};


// Comprehensive validation function for cancellation reason
function validateOrderReason(reason, type = 'general') {
  // This can be shared between cancellation and return validation
  // Just change the error messages based on the type parameter
  const MIN_LENGTH = 10;
  const MAX_LENGTH = 500;
  const actionType = type === 'cancel' ? 'Cancellation' : 'Return';
  
  if (!reason) {
    return {
      isValid: false,
      message: `${actionType} reason is required`
    };
  }

  const cleanedReason = reason.trim().replace(/\s+/g, ' ');
  
  if (cleanedReason.length === 0) {
    return {
      isValid: false,
      message: `${actionType} reason cannot be empty`
    };
  }

  if (cleanedReason.length < MIN_LENGTH) {
    return {
      isValid: false,
      message: `${actionType} reason must be at least ${MIN_LENGTH} characters long`
    };
  }

  if (cleanedReason.length > MAX_LENGTH) {
    return {
      isValid: false,
      message: `${actionType} reason cannot exceed ${MAX_LENGTH} characters`
    };
  }

  const uniqueChars = new Set(cleanedReason.toLowerCase().replace(/\s/g, ''));
  if (uniqueChars.size < 3) {
    return {
      isValid: false,
      message: `Please provide a meaningful ${actionType.toLowerCase()} reason`
    };
  }

  const inappropriateWords = ['damn', 'shit', 'fuck', 'bitch', 'asshole', 'bastard'];
  const lowerReason = cleanedReason.toLowerCase();
  const hasProfanity = inappropriateWords.some(word => 
    lowerReason.includes(word.toLowerCase())
  );
  
  if (hasProfanity) {
    return {
      isValid: false,
      message: `Please use appropriate language in your ${actionType.toLowerCase()} reason`
    };
  }

  const words = cleanedReason.toLowerCase().split(' ');
  const wordCount = {};
  let maxRepeats = 0;
  
  words.forEach(word => {
    if (word.length > 2) {
      wordCount[word] = (wordCount[word] || 0) + 1;
      maxRepeats = Math.max(maxRepeats, wordCount[word]);
    }
  });
  
  if (maxRepeats > 5) {
    return {
      isValid: false,
      message: `Please provide a more descriptive ${actionType.toLowerCase()} reason`
    };
  }

  const hasLetters = /[a-zA-Z]/.test(cleanedReason);
  if (!hasLetters) {
    return {
      isValid: false,
      message: `${actionType} reason must contain descriptive text`
    };
  }

  const meaningfulWords = words.filter(word => word.length > 2);
  if (meaningfulWords.length < 2) {
    return {
      isValid: false,
      message: `Please provide a more detailed ${actionType.toLowerCase()} reason`
    };
  }

  return {
    isValid: true,
    cleanedReason: cleanedReason
  };
}

// here finally return is requested now it should be 
// approved from the admin then only will the status be returned 
// here the stock updation and refunding is not done , 
// it is only done after the admin has approved ie the status which
//  would be 'return requested' is changed to 'returned'


const returnOrder = async (req, res) => {
  const { orderId, productId } = req.params;
  const { reason } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER.NOT_FOUND });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );
    if (!product) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER.PRODUCT_NOT_FOUND });
    }

    if (product.status !== "Delivered") {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Product cannot be returned" });
    }

    if (product.status === "Return Requested" || product.status === "Returned") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false, 
        message: MESSAGES.ORDER.RETURN_ALREADY_REQUESTED
      });
    }

    // Enhanced return reason validation (reusing the same function)
    const validationResult = validateOrderReason(reason, "return");
    if (!validationResult.isValid) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: validationResult.message
      });
    }

    // Clean the reason after validation
    const cleanedReason = validationResult.cleanedReason;

    product.status = "Return Requested";
    product.returnReason = cleanedReason;
    await order.save();

    return res.json({ success: true });
  } catch (error) {
    console.error("Error requesting return:", error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.ORDER.RETURN_REQUEST_FAILED });
  }
};

//  Implementing Razorpay

const createRazorpayOrder = async (req, res) => {
  try {
    req.session.paymentAttempted = true;

    let grandTotal = Number(req.body.grandTotal) || 0; // ensure it's a number

    const couponDiscount = req.session.coupon?.discount || 0;
    const deliveryCharge = req.session.deliveryCharge || 0;

    // calculate final total
    let finalAmount = grandTotal + deliveryCharge - couponDiscount;

    // safety check
    if (finalAmount <= 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.PAYMENT.INVALID_AMOUNT });
    }

    // if amount is already in rupees, convert to paise
    // (check your frontend — if you're already sending paise, remove *100)
    finalAmount = Math.round(finalAmount * 100);

    // Razorpay limit check
    if (finalAmount > 50000000) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.PAYMENT.AMOUNT_EXCEEDS_LIMIT,
      });
    }

    const options = {
      amount: finalAmount,
      currency: "INR",
      receipt: "receipt_" + Date.now(), // ✅ fixed
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating razorpay order", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};


// Verify Razorpay Payment

const verifyRazorpayPayment = async (req, res) => {
  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      formData,
      isRetry = false
    } = req.body;

    //signature verification
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {

      req.session.orderAttempted = false;
      req.session.lastOrderFailed = false;


      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.PAYMENT.VERIFICATION_FAILED });
    }

    let savedOrder;

    if (isRetry && formData.orderId) {
      // Retry payment: Update existing order
      savedOrder = await Order.findByIdAndUpdate(
        formData.orderId,
        {
          orderStatus: "Processing",
          isPaid: true,
          paymentId: razorpay_payment_id,
        },
        { new: true }
      );
      
      // after payment has been done the product items should be decreased
      for (const item of savedOrder.products) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -item.quantity },
        });
      }

      await savedOrder.save();

      req.session.orderCompleted = true;

       req.session.order = savedOrder;
      req.session.paymentMethod = "Razorpay";

      
      return res.json({ success: true });

    } else {
      //  Save the order in DB
      savedOrder = await saveOrderFromSerializedData(
        formData,
        req.session.user?._id || req.session.passport._id,
        true,
        req.session?.coupon?.code,
        req.session?.coupon?.discount,
        req.session?.deliveryCharge
      ); // true means paid

      //update the quantity(stock) in the productSchema
      for (const item of savedOrder.products) {
        const productId = item.productId;
        const quantity = item.quantity;

        await Product.findByIdAndUpdate(productId, {
          $inc: { quantity: -quantity },
        });
      }

    req.session.orderPlaced = true;
    req.session.checkoutInProgress = false;
    req.session.paymentAttempted = false;

      //  Store the saved order in session for success page
      req.session.order = savedOrder;
      req.session.paymentMethod = "Razorpay";

      return res.json({ success: true });
    }
  } catch (error) {
    console.error("Error verifying razorpay payment", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

const razorPaymentFailed = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.passport._id;
    const { cartItems, grandTotal, shippingAddress } = req.body;

    const itemsArray = Array.isArray(cartItems)
      ? cartItems
      : Object.values(cartItems);

      const offerDiscountTotal = itemsArray.reduce((sum, item) => {
      return sum + (parseFloat(item.price) - parseFloat(item.discountedPrice)) * item.quantity;
    }, 0);

      const couponDiscount  = req.session.coupon?.discount || 0;
      const deliveryCharge = req.session.deliveryCharge;
      const finalTotal = parseFloat(grandTotal) + parseFloat(deliveryCharge) - parseFloat(couponDiscount);


    const order = {
      userId: userId,
      products: itemsArray.map((item) => ({
        productId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        discountedPrice: parseFloat(item.discountedPrice),
        quantity: parseInt(item.quantity),
        subtotal: parseFloat(item.subtotal),
      })),
      shippingAddress,
      paymentMethod: "Razorpay",
      totalAmount: parseFloat(finalTotal),
      deliveryCharge,
      orderStatus: "Pending",
      createdAt: new Date(),
      discountAmount: parseFloat(offerDiscountTotal) || 0,
      couponCode: req.session.coupon?.code || null,
      couponDiscount: couponDiscount
    };

    const newOrder = new Order(order);
    await newOrder.save();

    // Clear cart and coupon
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    req.session.orderPlaced = true;
    req.session.checkoutInProgress = false;
    req.session.paymentAttempted = false;

    // Store the failed order temporarily to show on failure page
    req.session.failedOrder = newOrder;
    req.session.orderAttempted = true;
    req.session.lastOrderFailed = true;

    return res.json({ success: true });
  } catch (error) {
    console.error("Error handling payment failure:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.PAYMENT.FAILED_ORDER_SAVE });
  }
};

const getOrderFailurePage = async (req, res) => {
  try {
    const order = req.session.failedOrder;

    if (!order) return res.redirect("/checkout");

    const grandTotal = order.products.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);

    req.session.failedOrder = null;

    req.session.orderPlaced = true;
    req.session.checkoutInProgress = false;
    req.session.paymentAttempted = false;


    return res.render("orderFailure", {
      order,
      paymentMethod: "Razorpay",
      grandTotal
    });
  } catch (error) {
    console.error("Error loading order failure page:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.SOMETHING_WRONG);
  }
};

const retryPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    const order = await Order.findById(orderId);

    if (
      !order ||
      order.orderStatus !== "Pending" ||
      order.paymentMethod !== "Razorpay"
    ) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Invalid retry request" });
    }

   


    const grandTotal = order.products.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);
    let totalAmount = parseFloat(grandTotal) + parseFloat(order.deliveryCharge) - parseFloat(order.couponDiscount);
    
    if (totalAmount <= 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.PAYMENT.INVALID_AMOUNT });
    }

    // if amount is already in rupees, convert to paise
    // (check your frontend — if you're already sending paise, remove *100)
    const amount = Math.round(totalAmount * 100);

    // Razorpay limit check
    if (amount > 50000000) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.PAYMENT.AMOUNT_EXCEEDS_LIMIT,
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: "retry_receipt_" + Date.now(),
    });

    res.json({
      success: true,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error in the retry-payment:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

const retryRazorPaymentFailed = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.passport._id;

    // You can also validate or fetch the order directly if you're passing orderId from frontend
    const { orderId } = req.body;
    const failedOrder = await Order.findById(orderId);

    if (!failedOrder || failedOrder.userId.toString() !== userId.toString()) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.ORDER.INVALID_ORDER });
    }

    // Store the failed order ID in session
    req.session.failedOrderId = failedOrder._id;
    req.session.orderAttempted = true;
    req.session.lastOrderFailed = true;

    return res.json({ success: true });
  } catch (error) {
    console.error("Error handling payment failure:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.SOMETHING_WRONG });
  }
};

// GET /payment-failed or /razorpay-payment-failed
const getRetryRazorpayFailurePage = async (req, res) => {
  try {
    const failedOrderId = req.session.failedOrderId;

    if (!failedOrderId) return res.redirect("/checkout");

    const failedOrder = await Order.findById(failedOrderId).populate("products.productId").lean();
    const grandTotal = failedOrder.products.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);

    req.session.failedOrderId = null; // clear it after use

    return res.render("orderFailure", {
      order: failedOrder,
      paymentMethod: "Razorpay",
      grandTotal
    });
  } catch (error) {
    console.error("Error rendering failed payment page:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.SOMETHING_WRONG);
  }
};




module.exports = {
  saveOrderInSession,
  getOrderSuccess,
  getOrdersPage,
  getOrderDetails,
  cancelOrder,
  returnOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorPaymentFailed,
  getOrderFailurePage,
  retryPayment,
  retryRazorPaymentFailed,
  getRetryRazorpayFailurePage,
  calculateDeliveryCharge,
  saveWalletOrder
};
