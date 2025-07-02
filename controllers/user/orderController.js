const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");


const saveOrderInSession = async (req, res) => {
    try {
      
        const { cartItems, grandTotal, shippingAddress, payment } = req.body;
        console.log("orderController",cartItems);

        
        const itemsArray = Array.isArray(cartItems) ? cartItems : Object.values(cartItems);

        // Format the order details
        console.log("itemArray:",itemsArray);
        console.log(req.session.user.id);
        
        
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

        const newOrder = new Order(order);
        await newOrder.save();

        res.redirect("/userOrder/success");
    } catch (error) {
        console.error("Error saving order in session:", error);
        res.status(500).json({ message: "Failed to save order." });
    }
};

const getOrderSuccess = (req, res) => {
    try {
        // Check if order exists in session
        const order = req.session.order;

        if (!order) {
            return res.redirect("/userCheckout"); // Redirect to checkout if no order in session
        }

        // Render the success page with order details
        res.render("orderSuccess", { order });
    } catch (error) {
        console.error("Error displaying order success page:", error);
        res.status(500).send("Failed to load order success page.");
    }
};

const getOrdersPage = async(req, res) =>{
    try {
        const userId = req.session.userId;
        const filter = req.query.filter || "all"; // Default to 'all' if no filter is selected
        const query = { userId };

        if (filter === "5") {
            query.createdAt = { $gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }; // Last 5 days
        } else if (filter === "15") {
            query.createdAt = { $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }; // Last 15 days
        } else if (filter === "30") {
            query.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }; // Last 30 days
        } else if (filter === "180") {
            query.createdAt = { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }; // Last 6 months
        }


        const orders = await Order.find({userId}).sort({createdAt: -1}).populate("products.productId", "name image price");
    
        res.render("userOrder", {orders});
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Failed to load orders");
        
    }

   
};

const getOrderDetails = async(req, res) =>{
    try {
        const {orderId} = req.params;

        const order = await Order.findById(orderId)
             .populate("products.productId", "name image price")
             .lean() // convert the mongoose document to plain js object for easier handling

        if(!order){
            return res.status(404).send("Order not found");
        }     

        const isCancellable = order.status === "Processing" || order.status === "Shipped";
        const isReturnable = order.status === "Delivered";

        res.render("orderDetails", {
            order, 
            isCancellable,
            isReturnable
        });
                            
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Failed to load order details");
    }
};

const cancelOrder = async(req, res) =>{
    const {orderId} = req.params;
    try {
        const order = await Order.findById(orderId);
        if(order.status !== "Processing" && order.status !== "Shipped"){
            return res.status(400).json({ success: false, message: "Order cannot be cancelled"});
        }
        order.status = "Cancelled";
        await order.save();
        res.json({success: true});
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




module.exports = {saveOrderInSession,
                  getOrderSuccess,
                  getOrdersPage,
                  getOrderDetails,
                  cancelOrder,
                  returnOrder
                 };