const express = require("express");
const adminRouter = express.Router();
const loginController = require("../controllers/admin/loginController");
const dashboardController = require("../controllers/admin/dashboardController");
const userController = require("../controllers/admin/userController");
const adminAuth = require("../middleware/adminAuth");
const admin404Controller = require("../controllers/admin/404Controller");
const productController = require("../controllers/admin/productController");
const multer = require("multer");
const uploads = require("../middleware/productUpload");
const categoryController = require("../controllers/admin/categoryController");
const logoutController = require("../controllers/admin/logoutController");
const orderController = require("../controllers/admin/orderController");
const couponController = require("../controllers/admin/couponController");
const offerController = require('../controllers/admin/offerController');

adminRouter.get("/", adminAuth.isLogout, loginController.loadLogin);
adminRouter.post("/", adminAuth.isLogout, loginController.login);
adminRouter.use(adminAuth.isLogin);
adminRouter.get("/dashboard", dashboardController.loadDashboard);
adminRouter.get("/users", userController.getAllUsers);

adminRouter.delete("/block/:id", userController.blockUser);
adminRouter.put("/unblock/:id", userController.unblockUser);
adminRouter.get("/pageerror", admin404Controller.pageError);

//product Management

adminRouter.get("/products/addProducts", productController.getProductAddPage);
adminRouter.post(
  "/products/addProducts",
  uploads.any(),
  productController.addProducts
);
adminRouter.get("/productList", productController.getAllProducts);
adminRouter.get("/products/editProduct/:id", productController.getEditProduct);
adminRouter.post(
  "/products/updateProduct",
  uploads.any(),
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
adminRouter.post('/orders/update-status', orderController.updateProductStatus);
adminRouter.post('/orders/cancel-product', orderController.cancelProductByIndex);

adminRouter.get("/coupon", couponController.getCouponList);
adminRouter.get("/coupon/add-coupon", couponController.renderAddCouponPage);
adminRouter.post("/coupon/add-coupon", couponController.addCoupon);
adminRouter.get("/coupon/edit-coupon/:id", couponController.getEditCoupon);
adminRouter.put("/coupon/edit-coupon/:id", couponController.updateCoupon);
adminRouter.patch('/coupons/toggle/:id', couponController.toggleCouponStatus);

adminRouter.get('/offer', offerController.getOfferList);
adminRouter.get('/offer/add-offer', offerController.getAddOffer);
adminRouter.post('/offer/add-offer', offerController.postAddOffer);
adminRouter.patch('/offer/toggle/:id', offerController.toggleOfferStatus);
adminRouter.get('/offer/edit-offer/:id', offerController.getEditOffer);
adminRouter.put('/offer/edit-offer/:id', offerController.updateOffer);






module.exports = adminRouter;
