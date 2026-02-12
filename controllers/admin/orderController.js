import Product from "../../models/productSchema.js";
import Order from "../../models/orderSchema.js";
import Wallet from "../../models/walletSchema.js";
import { STATUS_CODES, MESSAGES } from "../../constants/index.js";
import logger from "../../utils/logger.js";
import { emitOrderUpdated } from "../../utils/orderNotifier.js";

const getAdminOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.render("orderList", { orders });
  } catch (error) {
    logger.error("Error fetching orders", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .send(MESSAGES.ORDER.FETCH_FAILED);
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("userId", "email phone name")
      .populate("products.productId", "name image");
    if (!order)
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.ORDER.NOT_FOUND });

    // need to check
    const grandTotal = order.totalAmount;

    res.render("orderDetails", { order, grandTotal });
  } catch (error) {
    logger.error("Error fetching order by ID:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      message: MESSAGES.ORDER.ORDER_DETAILS_FETCH_FAILED,
      error: error.message,
    });
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
      date: new Date(),
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
          date: new Date(),
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

    if (!order) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER.NOT_FOUND });
    }

    if (order.orderStatus === "Cancelled") {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.ORDER.ALREADY_CANCELLED });
    }

    const cancellableStatuses = ["Pending Payment", "Processing"];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.ORDER.CANNOT_CANCEL_STAGE });
    }

    for (let item of order.products) {
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { quantity: item.quantity },
      });
    }

    const refundAmount = order.totalAmount;

    const userId = order.userId._id;
    if (order.isPaid) {
      await handleRefundToWallet(userId, refundAmount, "Order Refund"); // for razor pay
    }

    order.orderStatus = "Cancelled";
    order.products.forEach((product) => {
      product.status = "Cancelled";
    });

    // Mark the array as modified
    order.markModified("products");

    await order.save();

    emitOrderUpdated(order);

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.ORDER.CANCELLED_AND_REFUNDED,
      products: order.products,
    });
  } catch (error) {
    logger.error("cancel Order Error: ", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ORDER.SERVER_ERROR_WHILE_CANCELLING,
    });
  }
};

// in the case of update if status is changed to delivered the the status is updated to delivered and the delivered date is displayed
// In the case of changing the status to returned or cancelled the refund is done for each product in the order according to the quantity
// and the stock is updated

// need to set condition if the product status not pending or processing product cannot be cancelled

function updateOverallOrderStatus(order) {
  const statuses = order.products.map((p) => p.status);

  if (statuses.every((s) => s === "Cancelled")) {
    order.orderStatus = "Cancelled";
  } else if (statuses.every((s) => s === "Returned")) {
    order.orderStatus = "Returned";
  } else if (statuses.every((s) => s === "Delivered")) {
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
    0,
  );

  // Active (non-cancelled/returned) products
  const activeProducts = order.products.filter(
    (p) => !["Cancelled", "Returned"].includes(p.status),
  );

  let refundAmount;

  if (
    activeProducts.length === 1 &&
    activeProducts[0]._id.equals(product._id)
  ) {
    // Last product → refund remaining amount (actual paid)
    refundAmount =
      order.totalAmount - totalRefundedSoFar - order.deliveryCharge;
  } else {
    // Proportional refund from amount actually paid
    const subtotal = order.products.reduce(
      (sum, p) => sum + p.discountedPrice * p.quantity,
      0,
    );
    const productPrice = product.discountedPrice * product.quantity;

    const totalWithoutDelivery = order.totalAmount - order.deliveryCharge;

    refundAmount = (productPrice / subtotal) * totalWithoutDelivery;
  }

  return refundAmount;
};

const updateProductStatus = async (req, res) => {
  try {
    const { orderId, productIndex, newStatus } = req.body;

    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("products.productId");
    if (!order) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.ORDER.NOT_FOUND });
    }

    const product = order.products[productIndex];
    if (!product) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.ORDER.INVALID_PRODUCT_INDEX });
    }

    const currentStatus = product.status;

    if (["Returned", "Cancelled"].includes(currentStatus)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: MESSAGES.ORDER.PRODUCT_ALREADY_RETURNED_OR_CANCELLED,
      });
    }

    // ----- HANDLE CANCELLATION -----
    if (newStatus === "Cancelled") {
      const cancellableStatuses = ["Pending", "Processing"];
      if (!cancellableStatuses.includes(currentStatus)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ORDER.CANNOT_CANCEL_THIS_PRODUCT,
        });
      }

      // Restore stock
      await Product.findByIdAndUpdate(product.productId._id, {
        $inc: { quantity: product.quantity },
      });

      product.status = "Cancelled";

      // Base refund
      const refundAmount = calculateRefund(order, product);
      product.refundedAmount = refundAmount;

      if (order.isPaid) {
        await handleRefundToWallet(
          order.userId._id,
          refundAmount,
          "Cancelled Refund",
        );
      }
    }

    // ----- HANDLE RETURN -----
    else if (newStatus === "Returned") {
      if (currentStatus !== "Return Requested") {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          message: MESSAGES.ORDER.PRODUCT_MUST_BE_IN_RETURN_REQUESTED,
        });
      }

      const MAx_RETURN_DAYS = 3;
      const deliveryDate = new Date(product.productId.deliveredAt);
      const daysSinceDelivery =
        ((Date.now() - deliveryDate.getTime()) / 1000) * 60 * 60 * 24;

      if (daysSinceDelivery > MAx_RETURN_DAYS) {
        res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ message: MESSAGES.ORDER.RETURN_WITHIN_3_DAYS });
      }

      product.status = "Returned";

      const refundAmount = calculateRefund(order, product);
      product.refundedAmount = refundAmount;

      await handleRefundToWallet(
        order.userId._id,
        refundAmount,
        "Return Refund",
      );

      await Product.findByIdAndUpdate(product.productId._id, {
        $inc: { quantity: product.quantity },
      });
    }

    // ----- DELIVERED -----
    else if (newStatus === "Delivered") {
      product.status = "Delivered";
      product.deliveredAt = new Date();
    }

    // ----- OTHER NORMAL TRANSITIONS -----
    else {
      product.status = newStatus;
    }

    updateOverallOrderStatus(order);
    await order.save();

    emitOrderUpdated(order);

    res.json({ message: MESSAGES.ORDER.PRODUCT_STATUS_UPDATED });
  } catch (error) {
    logger.error("Error updating status:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.GENERIC.SERVER_ERROR });
  }
};

const cancelProductByIndex = async (req, res) => {
  try {
    const { orderId, productIndex } = req.body;

    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("products.productId");

    if (!order)
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.ORDER.NOT_FOUND });

    const product = order.products[productIndex];
    if (!product)
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.ORDER.INVALID_PRODUCT_INDEX });

    // Only allow user to cancel if Pending or Processing
    if (!["Pending", "Processing"].includes(product.status)) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.ORDER.CANNOT_CANCEL_THIS_PRODUCT });
    }

    // Mark as cancelled
    product.status = "Cancelled";

    // Restore stock
    await Product.findByIdAndUpdate(product.productId._id, {
      $inc: { quantity: product.quantity },
    });

    // Base refund = cancelled product price * qty
    const refundAmount = calculateRefund(order, product);
    product.refundedAmount = refundAmount;

    // Refund if prepaid
    if (order.isPaid) {
      await handleRefundToWallet(
        order.userId._id,
        refundAmount,
        "Cancelled Refund",
      );
    }

    // Update overall order status
    updateOverallOrderStatus(order);

    await order.save();

    emitOrderUpdated(order);
    
    res.json({ message: MESSAGES.ORDER.PRODUCT_CANCELLED_AND_REFUNDED });
  } catch (error) {
    logger.error("Cancel product error:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.GENERIC.SERVER_ERROR });
  }
};

export default {
  getAdminOrders,
  getOrderById,
  cancelOrder,
  cancelProductByIndex,
  updateProductStatus,
  calculateRefund,
};
