const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");

const getAdminOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.render("orderList", { orders });
  } catch (error) {
    console.error("Error fetching orders");
    res.status(500).send("Error fetching orders");
  }
};

//order status Management in orders list page

// const updateOrderStatus = async(req, res) =>{
//     const {orderId} = req.params;
//     const {status} = req.body;
//     try {
//         await Order.findByIdAndUpdate( orderId, {status});
//         res.json({message: "Order status updated successfully"})
//     } catch (error) {
//         res.status(500).json({error:"Failed to update order status."});
//     }
// }

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("userId", "email phone name")
      .populate("products.productId", "name image");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // need to check
    const grandTotal = order.products.reduce((total, product) => 
      total + product.price * product.quantity, 0);

    res.render("orderDetails", { order, grandTotal });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res
      .status(500)
      .json({ message: "Error fetching order details", error: error.message });
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

//when order is cancelled the total amount of the order is refunded and the of each product in the order is incremented
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId")
      .populate("products.productId");

      console.log("cancelOrder", order);
      

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.orderStatus === "Cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Order already cancelled" });
    }

    const cancellableStatuses = ["Pending Payment", "Processing"];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot cancel order at this stage" });
    }

    for (let item of order.products) {
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { quantity: item.quantity },
      });
    }
    console.log("cancelOrder , incremented");
    

    const refundAmount = order.totalAmount;
    console.log(refundAmount);
    
    const userId = order.userId._id;
    if (order.isPaid) {
      await handleRefundToWallet(userId, refundAmount, "Order Refund");     // for razor pay
    }

    order.orderStatus = "Cancelled";
    order.products.forEach((product) => {
      product.status = "Cancelled";
    });

    // Mark the array as modified
    order.markModified("products");

    await order.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Order successfully cancelled and refund processed.",
        products: order.products,
      });
  } catch (error) {
    console.error("cancel Order Error: ", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error while cancelling order.",
      });
  }
};

// in the case of update if status is changed to delivered the the status is updated to delivered and the delivered date is dipslayed
// In the case of changing the status to returned or cancelled the refund is done for each product in the order according to the quantity
// and the stock is updated

// need to set condition if the product status not pending or processing product cannot be cancelled

const updateProductStatus = async (req, res) => {
  try {
    const { orderId, productIndex, newStatus } = req.body;

    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("products.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const product = order.products[productIndex];
    if (!product)
      return res.status(400).json({ message: "Invalid product Index" });

    if (["Returned", "Cancelled"].includes(product.status)) {
      return res
        .status(400)
        .json({ message: "Product already returned or cancelled" });
    }

    product.status = newStatus;
    if (newStatus === "Delivered") {
      product.deliveredAt = new Date();
    }

    if (["Returned", "Cancelled"].includes(newStatus)) {
      await Product.findByIdAndUpdate(product.productId._id, {
        $inc: { quantity: product.quantity },
      });

      const cancellableStatuses = ["Pending Payment", "Processing"];
      if (!cancellableStatuses.includes(product.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot be cancelled at this stage order at this stage" });
    }


      const refundAmount = product.price * product.quantity;

      if (order.isPaid) {
        await handleRefundToWallet(
          order.userId._id,
          refundAmount,
          `${newStatus} Refund`
        );
      }
    }

    await order.save();
    console.log("update Product status", order);
    res.json({ message: "Product status updated successfully" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const cancelProductByIndex = async (req, res) => {
  try {
    const { orderId, productIndex } = req.body;

    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("products.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const product = order.products[productIndex];

    //check if cancellable
    if (!["Pending", "Processing"].includes(product.status)) {
      return res
        .status(400)
        .json({ message: "Cannot cancel this product at this stage" });
    }

    product.status = "Cancelled";
    await Product.findByIdAndUpdate(product.productId, {
      $inc: { quantity: product.quantity },
    });

    const refundAmount = product.price * product.quantity;

    if (order.isPaid) {
      await handleRefundToWallet(
        order.userId._id,
        refundAmount,
        "Cancelled Refund"
      );
    }

    await order.save();
    res.json({ message: "Product cancelled and refunded." });
  } catch (error) {
    console.error("Cancel product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAdminOrders,
  getOrderById,
  cancelOrder,
  cancelProductByIndex,
  updateProductStatus,
};
