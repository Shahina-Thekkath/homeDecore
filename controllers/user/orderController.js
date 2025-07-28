const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");
const razorpay = require("../../config/razorpayInstance");
const crypto = require('crypto');
const qs = require('qs');
const Coupon = require('../../models/couponSchema');


const saveOrderFromSerializedData = async (formData, userId, isPaid = false) => {
    

    try {
        const userId = req.session.user._id;
        const parsedFormData = qs.parse(formData);
        
        
        const { cartItems, shippingAddress, payment, grandTotal } = parsedFormData;
      

    const orderItems = cartItems.map(item => ({
        productId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
        subtotal: parseFloat(item.subtotal)
    }));

    // console.log("orderItems", orderItems);
    

    const newOrder = new Order({
        userId: userId,
        products: orderItems,
        shippingAddress,
        paymentMethod: payment,
        totalAmount: parseFloat(grandTotal),
        status: isPaid,
        createdAt: new Date()
    });

    console.log("new order", newOrder);

    
    let savedOrder = await newOrder.save();
    
    
   if (!savedOrder || !savedOrder._id) {
            console.error("Order saving failed!");
             throw new Error("Order save failed");
        }
    
     if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });

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
    await Cart.deleteOne({userId });

    return {
        userId: userId,
        products: orderItems,
        shippingAddress,
        paymentMethod: payment,
        totalAmount: parseFloat(grandTotal),
        status: isPaid ,
        createdAt: new Date()
    };
    } catch (error) {
        console.error("Error Deserializing:", error);
        throw error;
        
    }
};



const saveOrderInSession = async (req, res) => {
    try {
      
         const userId = req.session.user._id;
        const { cartItems, grandTotal, shippingAddress, payment } = req.body;
      

        
        const itemsArray = Array.isArray(cartItems) ? cartItems : Object.values(cartItems);

        // Format the order details
     
        
        
        const order = {
            userId: req.session.user._id,
           
            products: itemsArray.map((item) => ({
                productId: item.id,
                name: item.name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity, 10),
                subtotal: parseFloat(item.subtotal),
            })),
            totalAmount: parseFloat(grandTotal),
            shippingAddress: shippingAddress, // Parse the selected address if passed as JSON
            paymentMethod: payment, 
            createdAt: new Date(),
        };

       
        req.session.order = order;
        req.session.paymentMethod = "COD";

        const newOrder = new Order(order);
        await newOrder.save();

            if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });

            if (coupon) {
                // Prevent double-use by the same user
                if (!coupon.usersUsed.includes(userId)) {
                    coupon.usersUsed.push(userId);
                    coupon.usedCount += 1;
                    await coupon.save();
                }
            }
        }

        await Cart.findOneAndUpdate({userId: req.session.user._id}, {$set:{items: []}});

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

        // Render the success page with order details
        res.render("orderSuccess", { order, paymentMethod});
    
     

    } catch (error) {
        console.error("Error displaying order success page:", error);
        res.status(500).send("Failed to load order success page.");
    }
};

const getOrdersPage = async(req, res) =>{
    try {
        const userId = req.session.user?._id;
       

        const user = await User.findById(userId);
        const filter = req.query.filter || "all"; // Default to 'all' if no filter is selected
        const query = { userId };
        console.log("User ID from session:", req.session.user);


        if (filter === "5") {
            query.createdAt = { $gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }; // Last 5 days
        } else if (filter === "15") {
            query.createdAt = { $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }; // Last 15 days
        } else if (filter === "30") {
            query.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }; // Last 30 days
        } else if (filter === "180") {
            query.createdAt = { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }; // Last 6 months
        }


        const orders = await Order.find(query).sort({createdAt: -1}).populate("products.productId", "name image price");
        
    
        res.render("userOrder", {orders, user, filter});
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Failed to load orders");
        
    }

   
};

const getOrderDetails = async (req, res) =>{
    try {
        const userId = req.session.user?._id;
        const user = await User.findById(userId);
        const {orderId} = req.params;

        const order = await Order.findById(orderId)
             .populate("products.productId", "name image price")
             .lean() // convert the mongoose document to plain js object for easier handling

        if(!order){
            return res.status(404).send("Order not found");
        }     

        const grandTotal = order.products.reduce((acc, product) => {
           return acc + product.price * product.quantity
        }, 0);
        
        console.log("Statuses for order products:");
        order.products.forEach((p, i) => {
        console.log(`Product ${i + 1}:`, p.status, typeof p.status);
        });


        order.products = order.products.map(product => {
            return {
                ...product,
                isCancellable: ["Pending", "Processing"].includes(product.status),
                isReturnable: product.status === "Delivered"
            };
        });

        res.render("manageOrder", {
            order,
            user,
            grandTotal
        });
                            
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Failed to load order details");
    }
};

const cancelOrder = async(req, res) =>{
    const {orderId, productId} = req.params;
    try {
        const order = await Order.findById(orderId);
     

        if(!order){
            return res.status(404).json({success: false, message: "Order not found"});
        }

        const product = order.products.find((p) => p.productId.toString() === productId);

        if(!product){
            return res.status(404).json({ success: false, message: "Product not found in this order"});
        }

        if (!["Pending", "Processing"].includes(product.status)) {
        return res.status(400).json({ success: false, message: `Cannot cancel a ${product.status.toLowerCase()} item` });
       }

        product.status = "Cancelled";
        console.log("new Order:", order);
        await order.save();
       return res.json({ success: true });
    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ success: false, message: "Failed to cancel order"});
        
        
    }
};

const returnOrder = async(req, res) =>{
    const {orderId} = req.params;
    try {
        const order = await Order.findById(orderId);
        if(order.status !== "Delivered"){
            return res.status(400).json({success: false, message: "Order cannot be returned"});
        }
        order.status = "return Requested";
        await order.save();
        res.json({ success: true}); 
        
    } catch (error) {
        console.error("Error requesting return:", error);
        res.status(500).json({ success: false, message: "Failed to request return"});
        
    }
};


//  Implementing Razorpay

const createRazorpayOrder = async (req, res) => {
     try {
        const amount = req.body.grandTotal * 100;

        const options = {
            amount,
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
        console.error("Error creating razorpay order",error);
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
            formData
        } = req.body;

        const generated_signature = crypto
           .createHmac("sha256", process.env.RAZORPAY_SECRET)
           .update(`${razorpay_order_id}|${razorpay_payment_id}`)
           .digest("hex");

           if(generated_signature === razorpay_signature){
               //  Save the order in DB
            const savedOrder = await saveOrderFromSerializedData(formData, req.session.user?._id, true); // true means paid

            console.log("savedOrder: ", savedOrder);
            

            //  Store the saved order in session for success page
            req.session.order = savedOrder;
            req.session.paymentMethod = "Razorpay";

            return res.json({ success: true });
           } else {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
           
    } catch (error) {
        console.log("Error verifying razorpay payment",error);
        res.status(500).json({ success: false });
    }
};




module.exports = {saveOrderInSession,
                  getOrderSuccess,
                  getOrdersPage,
                  getOrderDetails,
                  cancelOrder,
                  returnOrder,
                  createRazorpayOrder,
                  verifyRazorpayPayment
                 };