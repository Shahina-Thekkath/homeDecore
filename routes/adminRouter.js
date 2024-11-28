const express = require("express");
const adminRouter = express.Router();
const loginController = require("../controllers/admin/loginController");
const dashboardController = require("../controllers/admin/dashboardController");
const userController = require("../controllers/admin/userController");
const adminAuth = require("../middleware/auth");
const admin404Controller = require("../controllers/admin/404Controller");
const productController = require("../controllers/admin/productController");
const multer = require('multer');
const uploads = require("../middleware/productUpload");
const categoryController = require("../controllers/admin/categoryController");



adminRouter.get("/", loginController.loadLogin);
adminRouter.post("/",adminAuth.adminAuth, loginController.login);
adminRouter.get("/dashboard", dashboardController.loadDashboard);
adminRouter.get('/users', userController.getAllUsers);
// adminRouter.get('/users/:id', userController.getUserById);
adminRouter.delete("/block/:id", userController.blockUser);
adminRouter.put("/unblock/:id", userController.unblockUser);
adminRouter.get("/pageerror",admin404Controller.pageError);


//product Management


adminRouter.get("/products/addProducts",  productController.getProductAddPage)
adminRouter.post("/products/addProducts", adminAuth.adminAuth, uploads.array("images", 4), productController.addProducts);
adminRouter.get("/productList", productController.getAllProducts);


adminRouter.get("/category",adminAuth.adminAuth,categoryController.categoryInfo);
adminRouter.get("/addCategory",adminAuth.adminAuth,categoryController.getAddCategory);
adminRouter.post("/addCategory",adminAuth.adminAuth,categoryController.addCategory);
adminRouter.get("/editCategory/:id",adminAuth.adminAuth,categoryController.getEditCategory);
adminRouter.post("/editCategory/:id",adminAuth.adminAuth,categoryController.editCategory);
adminRouter.delete("/categoryBlock/:id",adminAuth.adminAuth,categoryController.blockCategory);
adminRouter.put("/categoryUnblock/:id",adminAuth.adminAuth,categoryController.unblockCategory);










module.exports = adminRouter;
