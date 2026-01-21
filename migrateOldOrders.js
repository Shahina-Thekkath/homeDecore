import dotenv from "dotenv";
import mongoose from "mongoose";

import Order from "./models/orderSchema.js";

dotenv.config();

async function migrateOldOrders() {

    try {
        console.log("Connecting database");

       await mongoose.connect(process.env.MONGODB_URI);

        console.log("DB connected");

        const ordersWithoutOrderId = await Order.find({orderId: {$exists: false}});

        console.log(`there are ${ordersWithoutOrderId.length} orders without orderId`);

        for(let order of ordersWithoutOrderId) {
            const newOrderId = generateOrderIdFromFormDate(order.createdAt);

            order.orderId = newOrderId;
            await order.save();
        }

        await mongoose.disconnect();

        console.log("database disconnected");
        process.exit(0);

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
   
}

migrateOldOrders();