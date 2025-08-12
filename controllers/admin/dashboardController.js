const { errorMonitor } = require('nodemailer/lib/xoauth2');
const Order = require('../../models/orderSchema');

const loadDashboard = async (req, res) =>{
    try {

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        // Total Sales due
        const totalSalesDue = await Order.aggregate([
            { $match: { isPaid: false } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        const totalSalesDueValue = totalSalesDue[0]?.total || 0;

        // Sales This Month
        const thisMonthSales = await Order.aggregate([
            { $match: { createdAt: { $gte: startOfMonth }, isPaid: true } },
            { $group: { _id:null, total: { $sum: "$totalAmount" } } }
        ]);
        const thisMonthSalesValue = thisMonthSales[0]?.total || 0;

        // sales last Month
        const lastMonthSales = await Order.aggregate([
            { $match: { createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }, isPaid: true } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } }}
        ]);

        const lastMonthSalesValue = lastMonthSales[0]?.total || 0;

        //Sales increase of decrement
       let salesIncrease = 0;
       let salesDecrease = 0;
       if (lastMonthSalesValue > 0) {
           const changePercent = ((thisMonthSalesValue - lastMonthSalesValue) / lastMonthSalesValue) * 100;
        if (changePercent > 0) {
           salesIncrease = changePercent.toFixed(2);
         } else {
           salesDecrease = Math.abs(changePercent).toFixed(2);
         }
      }


       res.render('dashboard',{
        totalSalesDue: totalSalesDueValue,
        salesIncrease,
        salesDecrease,
        thisMonthSales: thisMonthSalesValue,
        lastMonthSales: lastMonthSalesValue
       });
    } catch (error) {
        console.error("dashboard error", error);
        
        res.render("404Error");
    }
}

module.exports = {
                   loadDashboard,
}