const express = require("express");
const adminRouter = express.Router();
const loginController = require("../controllers/admin/loginController");
const dashboardController = require("../controllers/admin/dashboardController");
const userController = require("../controllers/admin/userController");
const adminAuth = require('../middleware/adminAuth');
const admin404Controller = require("../controllers/admin/404Controller");
const productController = require("../controllers/admin/productController");
const multer = require('multer');
const uploads = require("../middleware/productUpload");
const categoryController = require("../controllers/admin/categoryController");
const logoutController = require("../controllers/admin/logoutController");
const orderController = require("../controllers/admin/orderController")



adminRouter.get("/",adminAuth.isLogout, loginController.loadLogin);
adminRouter.post("/",adminAuth.isLogout,loginController.login);
adminRouter.get("/dashboard",adminAuth.isLogin, dashboardController.loadDashboard);
adminRouter.get('/users',adminAuth.isLogin, userController.getAllUsers);

adminRouter.delete("/block/:id",adminAuth.isLogin, userController.blockUser);
adminRouter.put("/unblock/:id",adminAuth.isLogin, userController.unblockUser);
adminRouter.get("/pageerror",adminAuth.isLogin, admin404Controller.pageError);


//product Management


adminRouter.get("/products/addProducts",adminAuth.isLogin,  productController.getProductAddPage)
adminRouter.post("/products/addProducts", adminAuth.isLogin, uploads.any(), productController.addProducts);
adminRouter.get("/productList", adminAuth.isLogin,productController.getAllProducts);
adminRouter.get("/products/editProduct/:id", adminAuth.isLogin,productController.getEditProduct);
adminRouter.post("/products/updateProduct",adminAuth.isLogin, uploads.any(), productController.updateProduct);
adminRouter.post("/products/removeProduct/:id",adminAuth.isLogin, productController.removeProduct);
adminRouter.get('/products/filter', adminAuth.isLogin, productController.filterProducts);

adminRouter.get("/category",adminAuth.isLogin,categoryController.categoryInfo);
adminRouter.get("/addCategory",adminAuth.isLogin,categoryController.getAddCategory);
adminRouter.post("/addCategory",adminAuth.isLogin,categoryController.addCategory);
adminRouter.get("/editCategory/:id",adminAuth.isLogin,categoryController.getEditCategory);
adminRouter.post("/editCategory/:id",adminAuth.isLogin,categoryController.editCategory);
adminRouter.delete("/categoryBlock/:id",adminAuth.isLogin,categoryController.blockCategory);
adminRouter.put("/categoryUnblock/:id", adminAuth.isLogin,categoryController.unblockCategory);
adminRouter.get('/logout', adminAuth.isLogin, logoutController.logout);

adminRouter.get('/orderList', adminAuth.isLogin, orderController.getAdminOrders);
adminRouter.post("/orders/updateStatus/:orderId", adminAuth.isLogin, orderController.updateOrderStatus);
adminRouter.get('/orders/:orderId', adminAuth.isLogin, orderController.getOrderById);
adminRouter.post('/orders/:id/cancel', adminAuth.isLogin, orderController.cancelOrder);











module.exports = adminRouter;
