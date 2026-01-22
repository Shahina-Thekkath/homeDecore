import Coupon from "../models/couponSchema.js";
import Product from "../models/productSchema.js";
import Order from "../models/orderSchema.js";
import Cart from "../models/cartSchema.js";
import Wallet from "../models/walletSchema.js";

export const finalizeOrder = async (order, session = null) => {
  for (const item of order.products) {
    await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { quantity: -item.quantity } },
      session ? { session } : {},
    );
  }
};

export const placeCODOrder = async (orderData, userId, session) => {
  console.log(
    "SESSION INSIDE SERVICE:",
    session ? "TRANSACTION" : "NO TRANSACTION",
  );

  for (const item of orderData.products) {
    const query = Product.findById(item.productId);
    if (session) query.session(session);
    const product = await query;

    if (!product || product.quantity < item.quantity) {
      throw new Error("insufficient stock");
    }
  }

  const orderDocs = await Order.create([orderData], { session });
  const order = orderDocs[0];

  for (const item of orderData.products) {
    await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { quantity: -item.quantity } },
      session ? { session } : {},
    );
  }

  if (orderData.couponCode) {
    await Coupon.updateOne(
      { code: orderData.couponCode, usersUsed: { $ne: userId } },
      { $push: { usersUsed: userId }, $inc: { usedCount: 1 } },
      session ? { session } : {},
    );
  }

  await Cart.updateOne(
    { userId },
    { $set: { items: [] } },
    session ? { session } : {},
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
    const query = Product.findById(item.productId);
    if (session) query.session(session);
    const product = await query;

    if (!product || product.quantity < item.quantity) {
      throw new Error("Insufficient stock");
    }
  }
  
  const walletQuery = Wallet.findOne({ userId });
  if (session) walletQuery.session(session);
  const wallet = await walletQuery;

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

  if (session) {
    await wallet.save({ session });
  } else {
    await wallet.save();
  }

  
  const order = new Order(orderData);

  if (session) {
    await order.save({ session });
  } else {
    await order.save();
  }


  for (const item of orderData.products) {
    await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { quantity: -item.quantity } },
      session ? { session } : {},
    );
  }

  if (orderData.couponCode) {
    await Coupon.updateOne(
      { code: orderData.couponCode, usersUsed: { $ne: userId } },
      { $push: { usersUsed: userId }, $inc: { usedCount: 1 } },
      session ? { session } : {},
    );
  }

  await Cart.updateOne(
    { userId },
    { $set: { items: [] } },
    session ? { session } : {},
  );

  return order;
};
