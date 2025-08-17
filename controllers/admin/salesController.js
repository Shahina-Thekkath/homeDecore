const Order = require('../../models/orderSchema');
const pdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require("path");
const ExcelJS = require('exceljs');

const getSalesReport = async (req, res) => {
    try {
        return res.render('salesReport');
    } catch (error) {
        console.error("Error loading sales Report page", error);
        res.json(500).send("Internal Server Error");
        
    }
};

function parseDate(input) {
  if (!input) return null;
  // Expecting "DD-MM-YYYY"
  const [day, month, year] = input.split("-");
  const d = new Date(`${year}-${month}-${day}`); // convert to YYYY-MM-DD
  return isNaN(d) ? null : d;
}

function buildMatchQuery(type = "daily", startDate, endDate) {
  const match = {
    orderStatus: { $nin: ["Cancelled", "Returned"] }, // ignore cancelled/returned
  };

  const now = new Date();

  if (type === "daily") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    const e = new Date(now);
    e.setHours(23, 59, 59, 999);
    match.createdAt = { $gte: s, $lte: e };
    console.log("daily", match);
    
  } else if (type === "weekly") {
    const e = new Date();
    const s = new Date();
    s.setDate(e.getDate() - 6); // include today + previous 6 days = 7 days window
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    match.createdAt = { $gte: s, $lte: e };
  } else if (type === "monthly") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    match.createdAt = { $gte: s, $lte: e };
  } else if (type === "custom" && startDate && endDate) {
    const s = parseDate(startDate);
    const e = parseDate(endDate);
    e.setHours(23, 59, 59, 999); // include full end day
    match.createdAt = { $gte: s, $lte: e };
  }

  console.log(match);
  return match;
}


const getSalesReportData = async (req, res) => {
    try {
    const { type = "daily", startDate, endDate } = req.query;
    console.log("salesReport", type, startDate, endDate);
    

    const matchQuery = buildMatchQuery(type, startDate, endDate);

    // list of orders for table rows
    const ordersPromise = await Order.find(matchQuery)
      .select("_id createdAt totalAmount discountAmount couponDiscount")
      .sort({ createdAt: -1 })
      .lean();
      console.log("ordersPromise", ordersPromise);
      

    // summary aggregation
    const summaryPromise = Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$totalAmount", 0] } },            // net after discounts
          totalOfferDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },   // offer discount (₹)
          totalCouponDiscount: { $sum: { $ifNull: ["$couponDiscount", 0] } },  // coupon discount (₹)
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalAmount: 1,
          totalOfferDiscount: 1,
          totalCouponDiscount: 1,
        },
      },
    ]);

    const [ordersRaw, summaryArr] = await Promise.all([ordersPromise, summaryPromise]);
    const summary =
      summaryArr[0] || {
        totalOrders: 0,
        totalAmount: 0,
        totalOfferDiscount: 0,
        totalCouponDiscount: 0,
      };

    // decorate orders with gross & net for the table
    const orders = ordersRaw.map((o) => {
      const offer = o.discountAmount || 0;
      const coupon = o.couponDiscount || 0;
      const net = o.totalAmount || 0;
      const gross = net + offer + coupon;
      return {
        _id: o._id,
        createdAt: o.createdAt,
        salesAmount: gross,
        discountAmount: offer,
        couponDiscount: coupon,
        netSales: net,
      };
    });

    return res.json({ success: true, report: summary, orders });
  } catch (err) {
    console.error("Error building sales report:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// pdf report download

const generateSalesPDF = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;

    //  Build query using helper
    const match = buildMatchQuery(type, startDate, endDate);

    //  Fetch orders from DB
    const orders = await Order.find(match).sort({ createdAt: 1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "No sales data found" });
    }

    //  Format data for the PDF
    const data = {
      range:
        type === "custom"
          ? `${startDate} to ${endDate}`
          : type.charAt(0).toUpperCase() + type.slice(1),
      orders: orders.map((o) => {
        const coupon = o.couponDiscount || 0;
        const offer = o.discountAmount || 0;
        const net = o.totalAmount || 0;
        const gross = net + offer + coupon;
        return{
            date: o.createdAt.toISOString().split("T")[0],
        orderId: o._id.toString(),
        salesAmount: net ,
        discount: o.discountAmount || 0,
        coupon: o.couponDiscount || 0,
        netSales: gross ,
        }
        
      }),
    };

    const summary = {
      totalAmount: data.orders.reduce((sum, o) => sum + o.salesAmount, 0),
      totalDiscount: data.orders.reduce((sum, o) => sum + o.discount, 0),
      totalCoupon: data.orders.reduce((sum, o) => sum + o.coupon, 0),
      totalCount: data.orders.length,
    };

    // 🖋️ Font setup
    const fonts = {
      Roboto: {
        normal: path.join(__dirname, "../../admin-public/assets/fonts/Noto_Serif,Roboto/Roboto/static/Roboto_SemiCondensed-Regular.ttf"),
        bold: path.join(__dirname, "../../admin-public/assets/fonts/Noto_Serif,Roboto/Roboto/static/Roboto_SemiCondensed-Bold.ttf"),
        italics: path.join(__dirname, "../../admin-public/assets/fonts/Noto_Serif,Roboto/Roboto/static/Roboto_Condensed-Italic.ttf"),
        bolditalics: path.join(__dirname, "../../admin-public/assets/fonts/Noto_Serif,Roboto/Roboto/static/Roboto_Condensed-BlackItalic.ttf")
      },
    };

    const printer = new pdfPrinter(fonts);

    const docDefinition = {
      content: [
        { text: `Sales Report (${type.toUpperCase()})`, style: "header" },
        { text: `Date Range: ${data.range}`, style: "subheader" },
        "\n",

        {
          table: {
            headerRows: 1,
            widths: ["auto", "*", "auto", "auto", "auto", "auto"],
            body: [
              ["Date", "Order ID", "Sales Amount", "Discounts", "Coupons", "Net Sales"],
              ...data.orders.map((o) => [
                o.date,
                o.orderId,
                o.salesAmount.toFixed(2),
                o.discount.toFixed(2),
                o.coupon.toFixed(2),
                o.netSales.toFixed(2),
              ]),
            ],
          },
        },
        "\n",

        { text: "Sales Summary", style: "subheader" },
        {
          table: {
            widths: ["*", "auto"],
            body: [
              ["Total Order Amount", `₹ ${summary.totalAmount.toFixed(2)}`],
              ["Total Offer Discount", `₹ ${summary.totalDiscount.toFixed(2)}`],
              ["Total Coupon Discount", `₹ ${summary.totalCoupon.toFixed(2)}`],
              ["Total Sales Count", `${summary.totalCount}`],
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
        subheader: { fontSize: 14, margin: [0, 10, 0, 5] },
        tableHeader: { bold: true, fontSize: 12, alignment: "center" },
      },
      defaultStyle: { font: "Roboto" },
    };

    // Send PDF as response
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="sales_report.pdf"');
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate sales report PDF",
      error: error.message,
    });
  }
};

const generateSalesExcel = async (req, res) => {
  try {
     const { type, startDate, endDate } = req.body;

    //  Build query using helper
    const match = buildMatchQuery(type, startDate, endDate);

    //  Fetch orders from DB
    const orders = await Order.find(match).sort({ createdAt: 1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "No sales data found" });
    }

    //  Format data for the PDF
    const data = {
      range:
        type === "custom"
          ? `${startDate} to ${endDate}`
          : type.charAt(0).toUpperCase() + type.slice(1),
      orders: orders.map((o) => {
        const coupon = o.couponDiscount || 0;
        const offer = o.discountAmount || 0;
        const net = o.totalAmount || 0;
        const gross = net + offer + coupon;
        return{
            date: o.createdAt.toISOString().split("T")[0],
        orderId: o._id.toString(),
        salesAmount: net ,
        discount: o.discountAmount || 0,
        coupon: o.couponDiscount || 0,
        netSales: gross ,
        }
        
      }),
    };

    const summary = {
      totalAmount: data.orders.reduce((sum, o) => sum + o.salesAmount, 0),
      totalDiscount: data.orders.reduce((sum, o) => sum + o.discount, 0),
      totalCoupon: data.orders.reduce((sum, o) => sum + o.coupon, 0),
      totalCount: data.orders.length,
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    // Title
    worksheet.mergeCells("A1:F1");
    worksheet.getCell("A1").value = `Sales Report (${data.range})`;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    // Empty row
    worksheet.addRow([]);

   
    // Orders Table
    worksheet.addRow([
      "Date",
      "Order ID",
      "Sales Amount",
      "Discount",
      "Coupon",
      "Net Sales",
    ]);

    data.orders.forEach((order) =>
      worksheet.addRow([
        order.date,
        order.orderId,
        order.salesAmount,
        order.discount,
        order.coupon,
        order.netSales,
      ])
    );

    // Style Header Row
    const headerRow = worksheet.getRow(3); // since 1 = title, 2 = blank, 3 = header
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add empty row before summary
    worksheet.addRow([]);
    worksheet.addRow(["Sales Summary"]);

    // Summary rows
    const summaryData = [
      ["Total Order Amount", summary.totalAmount],
      ["Total Offer Discount", summary.totalDiscount],
      ["Total Coupon Discount", summary.totalCoupon],
      ["Total Sales Count", summary.totalCount],
    ];

    summaryData.forEach((row) => worksheet.addRow(row));

    // Style Summary Title
    const summaryTitleRow = worksheet.getRow(orders.length + 5); // after table
    summaryTitleRow.font = { bold: true, size: 14 };

    //Generate Excel Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    //send as Response (Download)
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=sales_report.xlsx");

    res.send(buffer);
    
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).send("Error generating Excel file");
    
  }
};



module.exports = { getSalesReport,
                   getSalesReportData,
                   generateSalesPDF,
                   generateSalesExcel
 };

