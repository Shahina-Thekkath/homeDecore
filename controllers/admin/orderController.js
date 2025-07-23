const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');

const getAdminOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
        .populate("userId", "name email")
        .sort({createdAt: -1});
        

        res.render('orderList', {orders});
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



const getOrderById = async(req, res) =>{
    
    try {
            const order = await Order.findById(req.params.orderId).populate('userId', 'email phone name')
            .populate('products.productId', 'name image');
            if(!order) return res.status(404).json({message: "Order not found"});


            const grandTotal = order.products.reduce((total, product) =>{
               return product.status !== 'Cancelled'?
               total + product.price * product.quantity: total;
            }, 0);

            

          res.render('orderDetails', {order, grandTotal});
    } catch (error) {
        console.error('Error fetching order by ID:', error);
        res.status(500).json({ message: 'Error fetching order details', error: error.message });
    }
}

//this is using ajax
const cancelOrder = async(req, res) => {
    try {
        const order = await Order.findById(req.params.id)
        .populate('userId')
        .populate('products.productId');

        if(!order){
            return res.status(404).json({success: false, message: 'Order not found'});
        }

        if(order.orderStatus === 'Cancelled'){
            return res.status(400).json({success: false, message: 'Order already cancelled'});
        }

        const cancellableStatuses = ['Pending Payment', 'Processing'];
        if(!cancellableStatuses.includes(order.orderStatus)){
            return res.status(400).json({success: false, message: 'Cannot cancel order at this stage'});
        }

        for(let item of order.products){
            await Product.findByIdAndUpdate(item.productId._id, {
                $inc: { stock: item.quantity}
            });
        }

        const refundAmount = order.totalAmount;
        const user = order.userId;

        if(user.walletId){
            await Wallet.findByIdAndUpdate(user.walletId, {
                $inc: {balance: refundAmount },
                $push: {
                    transactions: {
                        type: 'credit',
                        amount: refundAmount,
                        reason: 'Order cancellation refund',
                        date: new Date()
                    }
                }
            });
        }

        order.orderStatus = 'Cancelled';
        order.products.forEach(product => {
                product.status = 'Cancelled';
                });

        // Mark the array as modified
        order.markModified('products');

        await order.save();

        res.status(200).json({success: true, message: 'Order successfully cancelled and refund processed.', products: order.products});

    } catch (error) {
        console.error('cancel Order Error: ', error);
        res.status(500).json({success: false, message: 'Server error while cancelling order.'});
    }
}


const updateProductStatus = async (req, res) =>{
    try {
        const { orderId, productIndex, newStatus } = req.body;

        const order = await Order.findById(orderId);
        if(!order) return res.status(404).json({ message: "Order not found" });

        if(newStatus === 'Delivered'){
            order.products[productIndex].deliveredAt = new Date();
            
            order.products[productIndex].status = newStatus;
            
        }

        await order.save();
        console.log("update Product status;",order);
        res.json({message: "Product status updated successfully"});

    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({message: "Server error"});
        
    }
};

const cancelProductByIndex = async (req, res) =>{
    try {
        const { orderId, productIndex } = req.body;

        const order = await order.findById(orderId).populate('userId');
        if(!order) return res.status(404).json({message: "Order not found"});

        const product = order.products[productIndex];

        //check if cancellable
        if(!['Pending', 'Processing'].includes(product.status)){
            return res.status(400).json({ message: "Cannot cancel this product at this stage" });
        }

        product.status = "Cancelled";
         
        const refundAmount = product.price * product.quantity;
        const user = order.userId;

        if(user.walletId) {
            await Wallet.findByIdAndUpdate(user.walletId, {
                $inc: {balance: refundAmount},
                $push: {
                    transactions: {
                        type: 'credit',
                        amount: refundAmount,
                        reason: 'Product cancellation refund',
                        date: new Date()
                    }
                }
            });
        }

        await Product.findByIdAndUpdate(product.productId, {
            $inc: {stock: product.quantity}
        });

        await order.save();
        res.json({ message: "Product cancelled and refunded." });

    } catch (error) {
        
          console.error("Cancel product error:", error);
          res.status(500).json({ message: "Server error" })
          
    
  }
};



module.exports = {   getAdminOrders,
                     getOrderById,
                     cancelOrder,
                     cancelProductByIndex,
                     updateProductStatus
};
