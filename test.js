// Reusable AJAX function
function loadReport(page = 1) {
  const fromDate = $("#fromDate").val();
  const toDate = $("#toDate").val();
  const filterType = $("#filterType").val();

  $.ajax({
    url: "/admin/sales-report/data",
    method: "GET", // your controller is GET, not POST
    data: { 
      page: page,           // pagination page
      type: filterType,     // daily/weekly/monthly/custom
      startDate: fromDate,  // only used if custom
      endDate: toDate 
    },
    success: function (data) {
      if (!data.success) {
        Swal.fire({ icon: "error", title: "Failed to load report" });
        return;
      }

      // 👉 1. Fill summary data
      $("#totalOrders").text(data.report.totalOrders);
      $("#totalAmount").text(data.report.totalAmount);
      $("#totalOfferDiscount").text(data.report.totalOfferDiscount);
      $("#totalCouponDiscount").text(data.report.totalCouponDiscount);

      // 👉 2. Fill orders table
      const tbody = $("#ordersTable tbody");
      tbody.empty();
      if (data.orders.length === 0) {
        tbody.append(`<tr><td colspan="5" class="text-center">No orders found</td></tr>`);
      } else {
        data.orders.forEach((order) => {
          tbody.append(`
            <tr>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
              <td>₹${order.salesAmount}</td>
              <td>₹${order.discountAmount}</td>
              <td>₹${order.couponDiscount}</td>
              <td>₹${order.netSales}</td>
            </tr>
          `);
        });
      }

      // 👉 3. Build pagination
      const pagination = $("#paginationContainer");
      pagination.empty();
      for (let i = 1; i <= data.totalPages; i++) {
        pagination.append(`
          <li class="page-item ${i === data.currentPage ? 'active' : ''}">
            <a href="#" class="page-link" data-page="${i}">${i}</a>
          </li>
        `);
      }
    },
    error: function () {
      Swal.fire({ icon: "error", title: "Something went wrong!" });
    }
  });
}

// --- Event bindings ---

// Generate Report button
$("#generateReport").on("click", function () {
  loadReport(1); // always start from page 1
});

// Pagination click
$("#paginationContainer").on("click", "a", function (e) {
  e.preventDefault();
  const page = $(this).data("page");
  loadReport(page); // load clicked page
});
