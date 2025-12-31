const Order = require('../../models/orderSchema');
const pdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require("path");
const ExcelJS = require('exceljs');
const { STATUS_CODES, MESSAGES } = require("../../constants");


const getSalesReport = async (req, res) => {
    try {
        
        return res.render('salesReport', {currentPage: 1, totalPages: 1, baseUrl: "/admin/salesReport"});
    } catch (error) {
        console.error("Error loading sales Report page", error);
        res.json(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.INTERNAL_ERROR);
        
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
  return match;
}


const getSalesReportData = async (req, res) => {
    try {
    const { type = "daily", startDate, endDate } = req.query;

    const currentPage = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (currentPage - 1) * limit;
    

    const matchQuery = buildMatchQuery(type, startDate, endDate);

    const totalOrdersCount = await Order.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalOrdersCount / limit);

    // list of orders for table rows
    const ordersPromise = await Order.find(matchQuery)
      .select("_id createdAt totalAmount discountAmount couponDiscount orderId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
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
        orderId: o.orderId,
        createdAt: o.createdAt,
        salesAmount: gross,
        discountAmount: offer,
        couponDiscount: coupon,
        netSales: net,
      };
    });
    
    return res.json({ success: true, report: summary, orders, currentPage, totalPages });
  } catch (err) {
    console.error("Error building sales report:", err);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.INTERNAL_ERROR });
  }
};


// pdf report download

const generateSalesPDF = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;

    const match = buildMatchQuery(type, startDate, endDate);
    const orders = await Order.find(match)
      .populate("products.productId") 
      .sort({ createdAt: 1 });

    if (!orders || orders.length === 0) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.SALES.NO_DATA_FOUND });
    }

    // 🔹 Format data
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
        return {
          date: o.createdAt.toISOString().split("T")[0],
          orderId: o.orderId.toString(),
          salesAmount: gross,
          discount: o.discountAmount || 0,
          coupon: o.couponDiscount || 0,
          netSales: net,
          products: o.products.map((p) => ({
            name: p.productId?.name || "Unknown",
            qty: p.quantity,
            price: p.discountedPrice,
            subtotal: p.discountedPrice * p.quantity,
          })),
        };
      }),
    };

    const summary = {
      totalAmount: data.orders.reduce((sum, o) => sum + o.salesAmount, 0),
      totalDiscount: data.orders.reduce((sum, o) => sum + o.discount, 0),
      totalCoupon: data.orders.reduce((sum, o) => sum + o.coupon, 0),
      totalCount: data.orders.length,
    };

    // Fonts
     const fonts = {
      Roboto: {
        normal: path.join(__dirname, "../../admin-public/assets/fonts/Noto_Serif,Roboto/Roboto/static/Roboto_SemiCondensed-Regular.ttf"),
        bold: path.join(__dirname, "../../admin-public/assets/fonts/Noto_Serif,Roboto/Roboto/static/Roboto_SemiCondensed-Bold.ttf"),
        italics: path.join(__dirname, "../../admin-public/assets/fonts/Noto_Serif,Roboto/Roboto/static/Roboto_Condensed-Italic.ttf"),
        bolditalics: path.join(__dirname, "../../admin-public/assets/fonts/Noto_Serif,Roboto/Roboto/static/Roboto_Condensed-BlackItalic.ttf")
      },
    };
    const printer = new pdfPrinter(fonts);

    // 🔹 Build doc definition
    const docDefinition = {
  pageSize: 'A4',
  pageMargins: [40, 60, 40, 60],
  background: function () {
    return {
      text: "THE ELEGANT ADOBE",
      color: "#FFE5CC",
      opacity: 0.1,
      bold: true,
      italics: false,
      fontSize: 60,
      alignment: "center",
      margin: [0, 300, 0, 0],
    };
  },
  content: [
    // Logo + title
    {
      stack: [
        {
          image: path.join(__dirname, "../../admin-public/assets/The Elegant Adobe-(Compressify.io)-1.png"),
          width: 150,
          margin: [0, 0, 0, 15]
        },
        {
          text: `Sales Report (${type.toUpperCase()})`,
          style: "header",
          color: '#FF6B00'
        }
      ],
      margin: [0, 0, 0, 10]
    },
    { text: `Date Range: ${data.range}`, style: "subheader", color: '#666' },
    { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#e0e0e0' }], margin: [0, 10, 0, 15] },

    // Order-level table
    {
      table: {
        headerRows: 1,
        widths: ["auto", "*", "auto", "auto", "auto", "auto"],
        body: [
          [
            { text: "Date", style: "tableHeader" },
            { text: "Order ID", style: "tableHeader" },
            { text: "Sales Amount", style: "tableHeader", alignment: 'right' },
            { text: "Discounts", style: "tableHeader", alignment: 'right' },
            { text: "Coupons", style: "tableHeader", alignment: 'right' },
            { text: "Net Sales", style: "tableHeader", alignment: 'right' }
          ],
          ...data.orders.map((o) => [
            { text: o.date, style: 'tableCell' },
            { text: o.orderId, style: 'tableCell', fontSize: 8 },
            { text: `₹${o.salesAmount.toFixed(2)}`, style: 'tableCell', alignment: 'right' },
            { text: `₹${o.discount.toFixed(2)}`, style: 'tableCell', alignment: 'right' },
            { text: `₹${o.coupon.toFixed(2)}`, style: 'tableCell', alignment: 'right' },
            { text: `₹${o.netSales.toFixed(2)}`, style: 'tableCell', alignment: 'right', bold: true }
          ]),
        ],
      },
      layout: {
        fillColor: function (rowIndex) {
          return rowIndex === 0 ? '#f5f5f5' : (rowIndex % 2 === 0 ? '#fafafa' : null);
        },
        hLineWidth: function (i, node) {
          return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5;
        },
        vLineWidth: function () {
          return 0;
        },
        hLineColor: function () {
          return '#e0e0e0';
        },
        paddingLeft: function () { return 8; },
        paddingRight: function () { return 8; },
        paddingTop: function () { return 6; },
        paddingBottom: function () { return 6; }
      },
      margin: [0, 0, 0, 20]
    },

    { text: "Order Details", style: "subheader", color: '#FF6B00', margin: [0, 15, 0, 10] },

    // Each order with products
    ...data.orders.flatMap((o) => [
      { 
        text: `Order: ${o.orderId} | Date: ${o.date}`, 
        style: "orderHeader",
        margin: [0, 10, 0, 5],
        color: '#333'
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto"],
          body: [
            [
              { text: "Product", style: "productTableHeader" },
              { text: "Qty", style: "productTableHeader", alignment: 'center' },
              { text: "Price", style: "productTableHeader", alignment: 'right' },
              { text: "Subtotal", style: "productTableHeader", alignment: 'right' }
            ],
            ...o.products.map((p) => [
              { text: p.name, style: 'productCell' },
              { text: p.qty.toString(), style: 'productCell', alignment: 'center' },
              { text: `₹${p.price.toFixed(2)}`, style: 'productCell', alignment: 'right' },
              { text: `₹${p.subtotal.toFixed(2)}`, style: 'productCell', alignment: 'right', bold: true }
            ]),
          ],
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex === 0 ? '#FFF5E6' : null;
          },
          hLineWidth: function (i, node) {
            return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5;
          },
          vLineWidth: function () {
            return 0;
          },
          hLineColor: function () {
            return '#e0e0e0';
          },
          paddingLeft: function () { return 8; },
          paddingRight: function () { return 8; },
          paddingTop: function () { return 6; },
          paddingBottom: function () { return 6; }
        },
        margin: [10, 0, 0, 5]
      }
    ]),

    { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#e0e0e0' }], margin: [0, 15, 0, 15] },
    
    { text: "Sales Summary", style: "subheader", color: '#FF6B00', margin: [0, 0, 0, 10] },
    {
      table: {
        widths: ["*", "auto"],
        body: [
          [
            { text: "Total Offer Discount", style: 'summaryLabel' },
            { text: `₹${summary.totalDiscount.toFixed(2)}`, style: 'summaryValue', alignment: 'right' }
          ],
          [
            { text: "Total Coupon Discount", style: 'summaryLabel' },
            { text: `₹${summary.totalCoupon.toFixed(2)}`, style: 'summaryValue', alignment: 'right' }
          ],
          [
            { text: "Total Order Amount", style: 'summaryLabelBold' },
            { text: `₹${summary.totalAmount.toFixed(2)}`, style: 'summaryTotal', alignment: 'right' }
          ],
        ],
      },
      layout: {
        fillColor: function (rowIndex, node) {
          return rowIndex === node.table.body.length - 1 ? '#FFF5E6' : null;
        },
        hLineWidth: function (i, node) {
          return i === node.table.body.length - 1 ? 2 : 0.5;
        },
        vLineWidth: function () {
          return 0;
        },
        hLineColor: function (i, node) {
          return i === node.table.body.length - 1 ? '#FF6B00' : '#e0e0e0';
        },
        paddingLeft: function () { return 10; },
        paddingRight: function () { return 10; },
        paddingTop: function () { return 8; },
        paddingBottom: function () { return 8; }
      },
      margin: [0, 0, 0, 20]
    },

    {
      text: 'Generated by The Elegant Adobe',
      style: 'footer',
      alignment: 'center',
      margin: [0, 20, 0, 0]
    }
  ],
  styles: {
    header: { 
      fontSize: 20, 
      bold: true, 
      margin: [0, 0, 0, 5] 
    },
    subheader: { 
      fontSize: 14, 
      bold: true, 
      margin: [0, 10, 0, 5] 
    },
    tableHeader: { 
      bold: true, 
      fontSize: 10, 
      color: '#333'
    },
    tableCell: {
      fontSize: 9,
      color: '#666'
    },
    orderHeader: {
      fontSize: 11,
      bold: true
    },
    productTableHeader: {
      bold: true,
      fontSize: 10,
      color: '#FF6B00'
    },
    productCell: {
      fontSize: 9,
      color: '#666'
    },
    summaryLabel: {
      fontSize: 11,
      color: '#666'
    },
    summaryValue: {
      fontSize: 11,
      color: '#333'
    },
    summaryLabelBold: {
      fontSize: 12,
      bold: true,
      color: '#333'
    },
    summaryTotal: {
      fontSize: 12,
      bold: true,
      color: '#FF6B00'
    },
    footer: {
      fontSize: 10,
      color: '#999',
      italics: true
    }
  },
  defaultStyle: { font: "Roboto" },
};

    // Generate & send
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="sales_report.pdf"');
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.SALES.PDF_GENERATION_FAILED,
      error: error.message,
    });
  }
};


const generateSalesExcel = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;
    const match = buildMatchQuery(type, startDate, endDate);

    // Fetch orders
    const orders = await Order.find(match).populate("products.productId").sort({ createdAt: 1 });
    if (!orders || orders.length === 0) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.SALES.NO_DATA_FOUND });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    // Title
    worksheet.mergeCells("A1:F1");
    worksheet.getCell("A1").value = `Sales Report (${type === "custom" ? `${startDate} to ${endDate}` : type.toUpperCase()})`;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };
    worksheet.addRow([]);

    // Order-level table header
    worksheet.addRow(["Date", "Order ID", "Sales Amount", "Discounts", "Coupons", "Net Sales"]);
    const headerRow = worksheet.getRow(3);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
      cell.alignment = { horizontal: "center" };
    });

    // Orders + products
    for (const o of orders) {
      const coupon = o.couponDiscount || 0;
      const offer = o.discountAmount || 0;
      const net = o.totalAmount || 0;
      const gross = net + offer + coupon;

      // Order row
      worksheet.addRow([o.createdAt.toISOString().split("T")[0], o.orderId.toString(), gross, offer, coupon, net]);

      // Product details header
      worksheet.addRow(["Product", "Qty", "Price", "Subtotal"]);
      const productHeader = worksheet.lastRow;
      productHeader.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
      });

      // Product rows
      o.products.forEach((p) => {
        worksheet.addRow([
          p.productId?.name || "Unknown",
          p.quantity,
          p.discountedPrice,
          p.discountedPrice * p.quantity,
        ]);
      });

      worksheet.addRow([]); // empty row after products
    }

    // Sales Summary
    worksheet.addRow(["Sales Summary"]);
    const summaryTitle = worksheet.lastRow;
    summaryTitle.font = { bold: true, size: 14 };

    const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0) + (o.discountAmount || 0) + (o.couponDiscount || 0), 0);
    const totalDiscount = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const totalCoupon = orders.reduce((sum, o) => sum + (o.couponDiscount || 0), 0);

    worksheet.addRow(["Total Offer Discount", totalDiscount]);
    worksheet.addRow(["Total Coupon Discount", totalCoupon]);
    worksheet.addRow(["Total Order Amount", totalAmount]);

    // Auto-width columns
    worksheet.columns.forEach((col) => {
      let maxLength = 0;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) maxLength = columnLength;
      });
      col.width = maxLength + 5;
    });

    // Generate Excel Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send file
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="sales_report.xlsx"');
    res.send(buffer);

  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SALES.EXCEL_GENERATION_FAILED);
  }
};




module.exports = { getSalesReport,
                   getSalesReportData,
                   generateSalesPDF,
                   generateSalesExcel
 };

