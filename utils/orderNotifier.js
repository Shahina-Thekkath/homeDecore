import { getIO } from "../config/socket.js";

export const notifyAdminNewOrder = (savedOrder) => {
    const io = getIO();
    io.to("admin").emit("order:new", {
      message: "New Order Received",
      orderId: savedOrder._id
    });
}

export const emitOrderUpdated = (order) => {
    const io = getIO();
    io.to("admin").emit("order:updated", {
        orderId: order._id
    });

    io.to(`user_${order.userId._id}`).emit("order:updated", {
        orderId: order._id
    });
};