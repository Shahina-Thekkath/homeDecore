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

const saveOrderFromSerializedData = async (
  formData,
  userId,
  isPaid = false,
  couponCode = null,
  discount = 0
) => {
  try {
    const parsedFormData = qs.parse(formData);

    const { cartItems, shippingAddress, payment, grandTotal } = parsedFormData;

    const orderItems = cartItems.map((item) => ({
      productId: item.id,
      name: item.name,
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity),
      subtotal: parseFloat(item.subtotal),
    }));

    const discountAmount = discount || 0;
      const finalTotal = parseFloat(grandTotal) - parseFloat(discountAmount);


    // console.log("orderItems", orderItems);

    const newOrder = new Order({
      userId: userId,
      products: orderItems,
      shippingAddress,
      paymentMethod: payment,
      totalAmount: finalTotal,
      isPaid: true,
      createdAt: new Date(),
      discountAmount: parseFloat(discountAmount) || 0,
      couponCode: couponCode || null,
      couponDiscount: discountAmount
    });

    console.log("new order", newOrder);

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
      status: isPaid,
      createdAt: new Date(),
      discountAmount: parseFloat(discountAmount) || 0,
      couponCode: couponCode || null,
    };
  } catch (error) {
    console.error("Error Deserializing:", error);
    throw error;
  }
};

const saveOrderInSession = async (req, res) => {
  try {
    const userId = req.session.user._id || req.session.passport._id;
    const { cartItems, grandTotal, shippingAddress, payment } = req.body;   // here the grandTotal is the amount after the  discount is applied if any but in cartSchema the discountedPrice and price are stored seperately
    

    const itemsArray = Array.isArray(cartItems)
      ? cartItems
      : Object.values(cartItems);

      const discountAmount = req.session.coupon?.discount || 0;
      const finalTotal = parseFloat(grandTotal) - parseFloat(discountAmount);

    // Format the order details

    const order = {
      userId: req.session.user._id || req.session.passport._id,

      products: itemsArray.map((item) => ({
        productId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity, 10),
        subtotal: parseFloat(item.subtotal),
      })),
      totalAmount: finalTotal,
      shippingAddress: shippingAddress, // Parse the selected address if passed as JSON
      paymentMethod: payment,
      createdAt: new Date(),
      discountAmount: parseFloat(discountAmount) || 0,
      couponCode: req.session.coupon?.code || null,
      couponDiscount: discountAmount
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
      { userId: req.session.user._id || req.session.passport._id},
      { $set: { items: [] } }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error("Error saving order in session:", error);
    res.status(500).json({ message: "Failed to save order." });
  }
};

const getOrderSuccess = (req, res) => {
  try {
    // Check if order exists in session
    const order = req.session.order;
    console.log("order sucesss:", order);

    const paymentMethod = req.session.paymentMethod;

    if (!order) {
      console.log("ordersucessError:", order);
      return res.redirect("/checkout"); // Redirect to checkout if no order in session
    }

    req.session.order = null;
    req.session.paymentMethod = null;
    req.session.coupon = null;

    const grandTotal = order.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);



    // Render the success page with order details
    res.render("orderSuccess", { order, paymentMethod, grandTotal });
  } catch (error) {
    console.error("Error displaying order success page:", error);
    res.status(500).send("Failed to load order success page.");
  }
};

const getOrdersPage = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const user = await User.findById(userId);
    const filter = req.query.filter || "all"; // Default to 'all' if no filter is selected
    const query = { userId };
    console.log("User ID from session:", req.session.user);

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
    res.status(500).send("Failed to load orders");
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const user = await User.findById(userId);
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("products.productId", "name image price")
      .lean(); // convert the mongoose document to plain js object for easier handling

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const grandTotal = order.products.reduce((acc, product) => {
      return acc + product.price * product.quantity;
    }, 0);

    console.log("Statuses for order products:");
    order.products.forEach((p, i) => {
      console.log(`Product ${i + 1}:`, p.status, typeof p.status);
    });

    order.products = order.products.map((product) => {
      return {
        ...product,
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
    res.status(500).send("Failed to load order details");
  }
};

const generateTransactionId = () => {
  const timestamp = Date.now().toString(); // current time in ms
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `TXN${timestamp}${randomPart}`;
};


const handleRefundToWallet = async (userId, amount, reason) => {
  const transactionId = generateTransactionId();
  console.log("transactionId", transactionId);
  


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

// cancel for a single product in an order
//here the product which has been cancelled, its stock is updated, amount is also refunded
const cancelOrder = async (req, res) => {
  const { orderId, productId } = req.params;
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in this order" });
    }

    if (!["Pending", "Processing"].includes(product.status)) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Cannot cancel a ${product.status.toLowerCase()} item`,
        });
    }

    // Update product stock
    const dbProduct = await Product.findById(productId);
    if (dbProduct) {
      dbProduct.quantity += product.quantity;
      await dbProduct.save();
    }

    const refundAmount = product.price * product.quantity;

    const userId = order.userId._id;
    if (order.isPaid) {
      await handleRefundToWallet(userId, refundAmount, "Order cancel Refund");     // for razor pay
    }

    product.status = "Cancelled";
    console.log("new Order:", order);
    await order.save();
    return res.json({ success: true });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
};

// here finally return is requested now it should be 
// approved from the admin then only will the status be returned 
// here the stock updation and refunding is not done , 
// it is only done after the admin has approved ie the status which
//  would be 'return requested' is changed to 'returned'


const returnOrder = async (req, res) => {
  const { orderId, productId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in this order" });
    }

    if (product.status !== "Delivered") {
      return res
        .status(400)
        .json({ success: false, message: "Product cannot be returned" });
    }

    product.status = "Return Requested";
    await order.save();

    return res.json({ success: true });
  } catch (error) {
    console.error("Error requesting return:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to request return" });
  }
};

//  Implementing Razorpay

const createRazorpayOrder = async (req, res) => {
  try {
    const { grandTotal, discountAmount = 0 } = req.body;

    const finalAmount = (grandTotal - discountAmount) * 100; // Convert to paise

    if (finalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment amount" });
    }

    const options = {
      amount: finalAmount,
      currency: "INR",
      receipt: "receipt_" + Date.now,
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
    res.status(500).json({ success: false });
  }
};

// Verify Razorpay Payment

const verifyRazorpayPayment = async (req, res) => {
  try {
    console.log("Session User:", req.session.user);

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
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }
     
    console.log("before saved Order");
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
      console.log("savedOrder", savedOrder);
      

      // after payment has been done the product items should be decreased
      for (const item of savedOrder.products) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -item.quantity },
        });
      }

      await savedOrder.save();

       req.session.order = savedOrder;
      req.session.paymentMethod = "Razorpay";

      
      return res.json({ success: true });

    } else {
      //  Save the order in DB
      savedOrder = await saveOrderFromSerializedData(
        formData,
        req.session.user?._id,
        true,
        req.session?.coupon?.code,
        req.session?.coupon?.discount
      ); // true means paid

      console.log("savedOrder: ", savedOrder);

      //update the quantity(stock) in the productSchema
      for (const item of savedOrder.products) {
        const productId = item.productId;
        const quantity = item.quantity;

        await Product.findByIdAndUpdate(productId, {
          $inc: { quantity: -quantity },
        });
      }

      //  Store the saved order in session for success page
      req.session.order = savedOrder;
      req.session.paymentMethod = "Razorpay";

      return res.json({ success: true });
    }
  } catch (error) {
    console.log("Error verifying razorpay payment", error);
    res.status(500).json({ success: false });
  }
};

const razorPaymentFailed = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { cartItems, grandTotal, shippingAddress } = req.body;

    const itemsArray = Array.isArray(cartItems)
      ? cartItems
      : Object.values(cartItems);

      const discountAmount = req.session.coupon?.discount || 0;
      const finalTotal = parseFloat(grandTotal) - parseFloat(discountAmount);


    const order = {
      userId: userId,
      products: itemsArray.map((item) => ({
        productId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
        subtotal: parseFloat(item.subtotal),
      })),
      shippingAddress,
      paymentMethod: "Razorpay",
      totalAmount: parseFloat(finalTotal),
      orderStatus: "Pending",
      createdAt: new Date(),
      discountAmount: parseFloat(discountAmount) || 0,
      couponCode: req.session.coupon?.code || null,
      couponDiscount: discountAmount
    };
    console.log("failure", order);

    const newOrder = new Order(order);
    await newOrder.save();

    // Clear cart and coupon
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    // Store the failed order temporarily to show on failure page
    req.session.failedOrder = newOrder;

    return res.json({ success: true });
  } catch (error) {
    console.error("Error handling payment failure:", error);
    return res.status(500).json({ message: "Failed to save failed order." });
  }
};

const getOrderFailurePage = async (req, res) => {
  try {
    const order = req.session.failedOrder;

    if (!order) return res.redirect("/checkout");

    const grandTotal = order.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    req.session.failedOrder = null;

    return res.render("orderFailure", {
      order,
      paymentMethod: "Razorpay",
      grandTotal
    });
  } catch (error) {
    console.error("Error loading order failure page:", error);
    res.status(500).send("Something went wrong.");
  }
};

const retryPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log("orderId", orderId);
    
    const order = await Order.findById(orderId);

    if (
      !order ||
      order.orderStatus !== "Pending" ||
      order.paymentMethod !== "Razorpay"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid retry request" });
    }

    const grandTotal = order.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmount = parseFloat(grandTotal) - parseFloat(order.discountAmount);

    const amount = totalAmount * 100;

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
    console.log("Error in the retry-payment:", error);
    res.status(500).json({ success: false });
  }
};

const retryRazorPaymentFailed = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // You can also validate or fetch the order directly if you're passing orderId from frontend
    const { orderId } = req.body;
    const failedOrder = await Order.findById(orderId);

    if (!failedOrder || failedOrder.userId.toString() !== userId.toString()) {
      return res.status(400).json({ success: false, message: "Invalid order." });
    }

    // Store the failed order ID in session
    req.session.failedOrderId = failedOrder._id;

    return res.json({ success: true });
  } catch (error) {
    console.error("Error handling payment failure:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /payment-failed or /razorpay-payment-failed
const getRetryRazorpayFailurePage = async (req, res) => {
  try {
    const failedOrderId = req.session.failedOrderId;

    if (!failedOrderId) return res.redirect("/checkout");

    const failedOrder = await Order.findById(failedOrderId).populate("products.productId").lean();
    const grandTotal = failedOrder.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    req.session.failedOrderId = null; // clear it after use

    return res.render("orderFailure", {
      order: failedOrder,
      paymentMethod: "Razorpay",
      grandTotal
    });
  } catch (error) {
    console.error("Error rendering failed payment page:", error);
    res.status(500).send("Something went wrong.");
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
  getRetryRazorpayFailurePage
};
