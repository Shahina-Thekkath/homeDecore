require('dotenv').config();
const mongoose = require('mongoose');

const Order = require('./models/orderSchema');
const generateOrderId = require('./helpers/generateOrderId');

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