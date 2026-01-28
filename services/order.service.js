import Coupon from "../models/couponSchema.js";
import Product from "../models/productSchema.js";
import Order from "../models/orderSchema.js";
import Cart from "../models/cartSchema.js";
import Wallet from "../models/walletSchema.js";

export const finalizeOrder = async (order, session) => {
  if (!session) {
    throw new Error("Session missing in finalizeOrder");
  }

  for (const item of order.products) {
    const updated = await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { quantity: -item.quantity } },
      { session, new: true }
    );

    if (!updated) {
      throw new Error("Product update failed");
    }
  }
};



export const placeCODOrder = async (orderData, userId, session) => {
  console.log(
    "SESSION INSIDE SERVICE:",
    session ? "TRANSACTION" : "NO TRANSACTION",
  );

  for (const item of orderData.products) {
   const product = await Product.findById(item.productId).session(session);

    if (!product || product.quantity < item.quantity) {
      throw new Error("insufficient stock");
    }
  }

  const order = new Order(orderData);
  await order.save({ session });
  
  for (const item of orderData.products) {
    await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { quantity: -item.quantity } },
      { session }
    );
  }

  if (orderData.couponCode) {
    await Coupon.updateOne(
      { code: orderData.couponCode, usersUsed: { $ne: userId } },
      { $push: { usersUsed: userId }, $inc: { usedCount: 1 } },
      { session }
    );
  }

  await Cart.updateOne(
    { userId },
    { $set: { items: [] } },
    { session }
  );

  return order;
};


export const placeWalletOrder = async (
  orderData,
  userId,
  finalTotal,
  session = null,
) => {
  console.log(
    "SESSION INSIDE WALLET SERVICE:",
    session ? "TRANSACTION" : "NO TRANSACTION",
  );

  for (const item of orderData.products) {
    const product = await Product.findById(item.productId).session(session);

    if (!product || product.quantity < item.quantity) {
      throw new Error("Insufficient stock");
    }
  }
  
  const wallet = await Wallet.findOne({ userId }).session(session);


  if (!wallet || wallet.balance < finalTotal) {
    throw new Error("Insufficient wallet balance");
  }

  wallet.balance -= finalTotal;
   wallet.transactions.push({
    transactionId: `TXN${Date.now()}`,
    type: "debit",
    amount: finalTotal,
    reason: "Order Payment",
    date: new Date(),
  });

  await wallet.save({ session });

  
  const order = new Order(orderData);

  await order.save({ session });


  for (const item of orderData.products) {
    await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { quantity: -item.quantity } },
      { session }
    );
  }

  if (orderData.couponCode) {
    await Coupon.updateOne(
      { code: orderData.couponCode, usersUsed: { $ne: userId } },
      { $push: { usersUsed: userId }, $inc: { usedCount: 1 } },
      { session }
    );
  }


   await Cart.updateOne(
    { userId },
    { $set: { items: [] } },
    { session }
  );

  return order;
};
