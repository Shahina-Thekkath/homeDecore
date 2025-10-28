const { errorMonitor } = require('nodemailer/lib/xoauth2');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const { STATUS_CODES, MESSAGES } = require("../../constants");

const loadDashboard = async (req, res) =>{
    try {

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
        const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0);
        const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

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
           salesIncrease = Math.abs(changePercent).toFixed(2);
         } else {
           salesDecrease = Math.abs(changePercent).toFixed(2);
         }
      }

      const recentProducts = await Product.find().sort({createdAt: -1}).limit(5);

      const topProducts = await Order.aggregate([
        { $match: { isPaid: true } },     // , orderStatus: "Delivered"
        { $unwind: "$products" },
        {
            $group: {
                _id: "$products.productId",
                totalSold: { $sum: "$products.quantity" }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        { $project: { _id:0, name: "$product.name", totalSold: 1 } }
      ]);
      

      const topCategories = await Order.aggregate([
        { $match: { isPaid: true } }, // , orderStatus: "Delivered"
        { $unwind: "$products" },
        {
            $lookup: {
                from: "products",
                localField: "products.productId",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $group: {
                _id: "$product.categoryId",
                totalSold: { $sum: "$products.quantity" }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: "$category" },
        { $project: { _id: 0, categoryName: "$category.name", totalSold: 1 } }
      ]);
      

       res.render('dashboard',{
        totalSalesDue: totalSalesDueValue,
        salesIncrease,
        salesDecrease,
        thisMonthSales: thisMonthSalesValue,
        lastMonthSales: lastMonthSalesValue,
        recentProducts,
        topProducts,
        topCategories
       });
    } catch (error) {
        console.error("dashboard error", error);
        
        res.render("404Error");
    }
}

const getSalesData = async (req, res) => {
  try {
    const { type } = req.query;

    let groupFormat, sortFormat;
    if (type === "weekly") {
      groupFormat = { year: { $year: "$createdAt" }, week: { $isoWeek: "$createdAt" } };
      sortFormat = { "_id.year": 1, "_id.week": 1 };
    } else if (type === "monthly") {
      groupFormat = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
      sortFormat = { "_id.year": 1, "_id.month": 1 };
    } else {
      groupFormat = { year: { $year: "$createdAt" } };
      sortFormat = { "_id.year": 1 };
    }

    const sales = await Order.aggregate([
      { $match: {isPaid: true } },
      {
        $group: {
          _id: groupFormat,
          totalSales: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: sortFormat }
    ]);

    res.json(sales);
  } catch (error) {
    console.error("getSalesData error:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.SALES.FETCH_FAILED });
  }
};



module.exports = {
                   loadDashboard,
                   getSalesData
}