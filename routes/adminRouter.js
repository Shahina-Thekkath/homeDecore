import express from "express";

const adminRouter = express.Router();

import loginController from "../controllers/admin/loginController.js";
import dashboardController from "../controllers/admin/dashboardController.js";
import userController from "../controllers/admin/userController.js";
import adminAuth from "../middleware/adminAuth.js";
import admin404Controller from "../controllers/admin/404Controller.js";
import productController from "../controllers/admin/productController.js";
import { uploads } from "../middleware/cloudinary.js";
import categoryController from "../controllers/admin/categoryController.js";
import logoutController from "../controllers/admin/logoutController.js";
import orderController from "../controllers/admin/orderController.js";
import couponController from "../controllers/admin/couponController.js";
import offerController from "../controllers/admin/offerController.js";
import salesController from "../controllers/admin/salesController.js";
import checkDuplicateProduct from "../middleware/checkDuplicateProduct.js";

adminRouter.get("/", adminAuth.isLogout, loginController.loadLogin);
adminRouter.post("/", adminAuth.isLogout, loginController.login);
adminRouter.use(adminAuth.isLogin);
adminRouter.get("/dashboard", dashboardController.loadDashboard);
adminRouter.get("/users", userController.getAllUsers);

adminRouter.put("/block/:id", userController.blockUser);
adminRouter.put("/unblock/:id", userController.unblockUser);
adminRouter.get("/pageerror", admin404Controller.pageError);

//product Management

adminRouter.get("/products/addProducts", productController.getProductAddPage);
adminRouter.post(
  "/products/addProducts",
  uploads.array("images", 5),
  checkDuplicateProduct,
  productController.addProducts
);
adminRouter.get("/productList", productController.getAllProducts);
adminRouter.get("/products/editProduct/:id", productController.getEditProduct);
adminRouter.post(
  "/products/updateProduct",
  uploads.array("images", 5),
  productController.updateProduct
);
adminRouter.post(
  "/products/removeProduct/:id",
  productController.removeProduct
);
adminRouter.get("/products/filter", productController.filterProducts);

adminRouter.get("/category", categoryController.categoryInfo);
adminRouter.get("/addCategory", categoryController.getAddCategory);
adminRouter.post("/addCategory", categoryController.addCategory);
adminRouter.get("/editCategory/:id", categoryController.getEditCategory);
adminRouter.post("/editCategory/:id", categoryController.editCategory);
adminRouter.delete("/categoryBlock/:id", categoryController.blockCategory);
adminRouter.put("/categoryUnblock/:id", categoryController.unblockCategory);
adminRouter.get("/logout", logoutController.logout);

adminRouter.get("/orderList", orderController.getAdminOrders);
adminRouter.get("/orders/:orderId", orderController.getOrderById);
adminRouter.post("/orders/:id/cancel", orderController.cancelOrder);
adminRouter.post("/orders/update-status", orderController.updateProductStatus);
adminRouter.post("/order/cancel-product", orderController.cancelProductByIndex);

adminRouter.get("/coupon", couponController.getCouponList);
adminRouter.get("/coupon/add-coupon", couponController.renderAddCouponPage);
adminRouter.post("/coupon/add-coupon", couponController.addCoupon);
adminRouter.get("/coupon/edit-coupon/:id", couponController.getEditCoupon);
adminRouter.put("/coupon/edit-coupon/:id", couponController.updateCoupon);
adminRouter.patch("/coupons/toggle/:id", couponController.toggleCouponStatus);

adminRouter.get("/offer", offerController.getOfferList);
adminRouter.get("/offer/add-offer", offerController.getAddOffer);
adminRouter.post("/offer/add-offer", offerController.postAddOffer);
adminRouter.patch("/offer/toggle/:id", offerController.toggleOfferStatus);
adminRouter.get("/offer/edit-offer/:id", offerController.getEditOffer);
adminRouter.put("/offer/edit-offer/:id", offerController.updateOffer);

adminRouter.get("/salesReport", salesController.getSalesReport);
adminRouter.get("/sales-report/data", salesController.getSalesReportData);
adminRouter.post("/sales-report/pdf", salesController.generateSalesPDF);
adminRouter.post("/sales-report/excel", salesController.generateSalesExcel);

adminRouter.get("/sales", dashboardController.getSalesData);

export default adminRouter;
