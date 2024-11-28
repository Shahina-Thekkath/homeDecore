const express = require("express");
const userRouter = express.Router();
const homeController = require("../controllers/user/homeController");
const load404Controller = require("../controllers/user/404Controller");
const signupController = require("../controllers/user/signupController");
const loginController = require("../controllers/user/loginController");
const passport = require('../config/passport');
const auth = require("../middleware/userAuth");
const logoutController = require("../controllers/user/logoutController");
// const GoogleStrategy = require('passport-google-oauth20').Strategy;


userRouter.get("/pageNotFound", load404Controller.pageNotFound);
userRouter.get("/",  homeController.loadHomepage);
userRouter.get("/signup", signupController.loadSignup);
userRouter.get("/login",auth.isLogout, loginController.loadLogin);
userRouter.post("/login", loginController.login);
userRouter.post("/signup", signupController.signup);
userRouter.post("/verify-otp", signupController.verifyOtp);
userRouter.post("/resend-otp", signupController.resendOtp);
userRouter.get("/logout", logoutController.logout);


// userRouter.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email'] }));

// userRouter.get('auth/google/callback', passport.authenticate('google', {failureRedirect: '/signup'}),(req, rs) =>{
//     res.redirect('/')
// });

userRouter.get("/auth/google", passport.authenticate('google',{
    scope:['email' , 'profile']
}))

userRouter.get('/forgotPassword', signupController.forgotPassword);
userRouter.post('/forgotPassword', signupController.forgotVerify);
userRouter.get('/resetPassword', signupController.resetPasswordLoad);
userRouter.post('/resetPassword', signupController.verifyResetPassword);





userRouter.get("/auth/google/callback",passport.authenticate('google',{
    successRedirect:"/success",
    failureRedirect:"/failure"
}));


userRouter.get("/success",signupController.successGoogleLogin)
userRouter.get("/failure",signupController.failureGoogleLogin)


module.exports = userRouter;