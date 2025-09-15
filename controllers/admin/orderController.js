const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const Coupon = require("../../models/couponSchema");

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
    const grandTotal = order.totalAmount;

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

// in the case of update if status is changed to delivered the the status is updated to delivered and the delivered date is displayed
// In the case of changing the status to returned or cancelled the refund is done for each product in the order according to the quantity
// and the stock is updated

// need to set condition if the product status not pending or processing product cannot be cancelled

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

const updateProductStatus = async (req, res) => {
  try {
    const { orderId, productIndex, newStatus } = req.body;

    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("products.productId");
    if (!order) {
      console.log("Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    const product = order.products[productIndex];
    if (!product) {
      console.log("Invalid product Index");
      return res.status(400).json({ message: "Invalid product Index" });
    }

    const currentStatus = product.status;

    //  Already final states
    if (["Returned", "Cancelled"].includes(currentStatus)) {
      return res
        .status(400)
        .json({ message: "Product already returned or cancelled" });
    }


    //  Handle Cancellation by Admin
    if (newStatus === "Cancelled") {
      const cancellableStatuses = ["Pending", "Processing"];
      if (!cancellableStatuses.includes(currentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel at this stage",
        });
      }

      // Restore stock
      await Product.findByIdAndUpdate(product.productId._id, {
        $inc: { quantity: product.quantity },
      });

      product.status = "Cancelled";

      // Refund calculation
      let refundAmount = product.discountedPrice * product.quantity;

      //  If this is the last product in the order → refund full amount
    const activeProducts = order.products.filter(
      p => !["Cancelled", "Returned"].includes(p.status)
    );

    if (activeProducts.length === 1 && activeProducts[0]._id.equals(product._id)) {
      // last product being cancelled/returned → refund full amount (before coupon)
      refundAmount = order.totalAmount; 
    } 
    //  Handle coupon adjustments
    else if (order.couponDiscount > 0 && order.couponCode) {
      const coupon = await Coupon.findOne({ code: order.couponCode });

      if (coupon) {
        // Remaining subtotal excluding cancelled product
        const remainingSubtotal = order.products.reduce((sum, p, idx) => {
          if (idx === productIndex || ["Cancelled", "Returned"].includes(p.status)) return sum;
          return sum + (p.discountedPrice * p.quantity);
        }, 0);

        if (remainingSubtotal >= coupon.minPurchaseAmount) {
          // Coupon still valid → deduct proportional coupon discount
          const subtotalBeforeCoupon = order.products.reduce((sum, p) => {
            if (["Cancelled", "Returned"].includes(p.status)) return sum;
            return sum + (p.discountedPrice * p.quantity);
          }, 0);

          const productShare = refundAmount / subtotalBeforeCoupon;
          const discountShare = productShare * order.couponDiscount;
          refundAmount -= discountShare;
        } else {
          // Coupon invalid after cancellation → refund full discounted price
          refundAmount = product.discountedPrice * product.quantity;
        }
      }
    }

      if (order.isPaid) {
        await handleRefundToWallet(
          order.userId._id,
          refundAmount,
          "Cancelled Refund"
        );
      }
    }

    // Handle Returned (only after Return Requested)
    else if (newStatus === "Returned") {
      if (currentStatus !== "Return Requested") {
        return res.status(400).json({
          message: "Product must be in Return Requested state before Returned",
        });
      }

      product.status = "Returned";

      let refundAmount = product.discountedPrice * product.quantity;

       const activeProducts = order.products.filter(
      p => !["Cancelled", "Returned"].includes(p.status)
    );

    if (activeProducts.length === 1 && activeProducts[0]._id.equals(product._id)) {
      // last product being cancelled/returned → refund full amount (before coupon)
      refundAmount = order.totalAmount; 
    } 
    //  Handle coupon adjustments
    else if (order.couponDiscount > 0 && order.couponCode) {
      const coupon = await Coupon.findOne({ code: order.couponCode });

      if (coupon) {
        // Remaining subtotal excluding cancelled product
        const remainingSubtotal = order.products.reduce((sum, p, idx) => {
          if (idx === productIndex || ["Cancelled", "Returned"].includes(p.status)) return sum;
          return sum + (p.discountedPrice * p.quantity);
        }, 0);

        if (remainingSubtotal >= coupon.minPurchaseAmount) {
          // Coupon still valid → deduct proportional coupon discount
          const subtotalBeforeCoupon = order.products.reduce((sum, p) => {
            if (["Cancelled", "Returned"].includes(p.status)) return sum;
            return sum + (p.discountedPrice * p.quantity);
          }, 0);

          if (subtotalBeforeCoupon > 0) {
            const productShare = refundAmount / subtotalBeforeCoupon;
            const discountShare = productShare * order.couponDiscount;
            refundAmount -= discountShare;
          }

        } else {
          // Coupon invalid after cancellation → refund full discounted price
          refundAmount = product.discountedPrice * product.quantity;
        }
      }
    }

      if (order.isPaid) {
        await handleRefundToWallet(
          order.userId._id,
          refundAmount,
          "Return Refund"
        );
      }

      //  Restore stock since returned
      await Product.findByIdAndUpdate(product.productId._id, {
        $inc: { quantity: product.quantity },
      });
    }

    //  Delivered case
    else if (newStatus === "Delivered") {
      product.status = "Delivered";
      product.deliveredAt = new Date();
    }

    // Other normal transitions (Processing → Shipped etc.)
    else {
      product.status = newStatus;
    }

    updateOverallOrderStatus(order);

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
    if (!product) return res.status(400).json({ message: "Invalid product index" });

    //  Only allow user to cancel if Pending or Processing
    if (!["Pending", "Processing"].includes(product.status)) {
      return res
        .status(400)
        .json({ message: "Cannot cancel this product at this stage" });
    }

    // Mark as cancelled
    product.status = "Cancelled";

    // Restore stock
    await Product.findByIdAndUpdate(product.productId._id, {
      $inc: { quantity: product.quantity },
    });

    // Base refund
    let refundAmount = product.discountedPrice * product.quantity;

     const activeProducts = order.products.filter(
      p => !["Cancelled", "Returned"].includes(p.status)
    );

    if (activeProducts.length === 1 && activeProducts[0]._id.equals(product._id)) {
      // last product being cancelled/returned → refund full amount (before coupon)
      refundAmount = order.totalAmount; 
    } 
    //  Handle coupon adjustments
    else if (order.couponDiscount > 0 && order.couponCode) {
      const coupon = await Coupon.findOne({ code: order.couponCode });

      if (coupon) {
        // Remaining subtotal excluding cancelled product
        const remainingSubtotal = order.products.reduce((sum, p, idx) => {
          if (idx === productIndex || ["Cancelled", "Returned"].includes(p.status)) return sum;
          return sum + (p.discountedPrice * p.quantity);
        }, 0);

        if (remainingSubtotal >= coupon.minPurchaseAmount) {
          // Coupon still valid → deduct proportional coupon discount
          const subtotalBeforeCoupon = order.products.reduce((sum, p) => {
            if (["Cancelled", "Returned"].includes(p.status)) return sum;
            return sum + (p.discountedPrice * p.quantity);
          }, 0);

          const productShare = refundAmount / subtotalBeforeCoupon;
          const discountShare = productShare * order.couponDiscount;
          refundAmount -= discountShare;
        } else {
          // Coupon invalid after cancellation → refund full discounted price
          refundAmount = product.discountedPrice * product.quantity;
        }
      }
    }

    //  Refund if prepaid
    if (order.isPaid) {
      await handleRefundToWallet(
        order.userId._id,
        refundAmount,
        "Cancelled Refund"
      );
    }

    updateOverallOrderStatus(order);
    
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
