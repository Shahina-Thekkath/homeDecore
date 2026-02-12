import { getIO } from "../config/socket.js";

export const emitProductAdded = (product) => {
    const io = getIO();

    io.to("admin").emit("product:added", {
        productId: product._id,
        name: product.name
    });

    io.to("public").emit("product:added", {
        productId: product._id,
    })
};

export const emitProductUpdated = (product) => {
    const io = getIO();

    io.to("admin").emit("product:updated", {
        productId: product._id
    });

    io.to("public").emit("product:updated", {
        productId: product._id
    });
};

export const emitProductStockChanged = (product) => {
  const io = getIO();

  io.to("public").emit("product:stockChanged", {
    productId: product._id,
    quantity: product.quantity,
  });
};

export const emitProductStatusChanged = (product) => {
    const io = getIO();

    io.to("admin").emit("product:statusChanged", {
        productId: product._id,
        isBlocked: product.isBlocked
    });

    io.to("public").emit("product:statusChanged", {
        productId: product._id,
        isBlocked: product.isBlocked
    });
};