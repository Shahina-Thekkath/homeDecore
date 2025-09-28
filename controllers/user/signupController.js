const User = require("../../models/userSchma");
const nodemailer = require("nodemailer");
const env = require('dotenv').config();
const bcrypt = require("bcrypt");
const session = require("express-session");
const randomstring = require("randomstring");

const loadSignup = async(req, res) =>{
    try {
        res.render('signup');
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

function generateOtp(){
    return Math.floor(100000 + Math.random()* 900000).toString();
};

async function sendVerificationEmail(email, otp){
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLs: true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });
        

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        })

        console.log("info", info);
        

        return info.accepted.length > 0    // info.accepted contains an array of email addresses which accepted the mail
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

const signup = async(req, res) =>{
    try {
        const{name,email, phone, password,cpassword} = req.body;
        if(password !== cpassword){
            return res.render("signup", {message: "Passwords do not match"});
        }
        
        const findUser = await User.findOne({email});
        if(findUser){
            return res.render("signup", {message: "user with this email already exists", name,email, phone, password});
        }

        const otp = generateOtp(); 

        const emailSent = await sendVerificationEmail(email, otp);
        if(!emailSent){
            return res.json("email.error")
        }

        req.session.userOtp = otp;
        
        req.session.userData = {name, phone, email, password};
        
        res.render("verify-otp");
        console.log("OTP Sent", otp);
        
    } catch (error) {
       console.error("signup error", error);
       res.redirect("/pageNotFound")
    }
};

const securePassword = async (password) =>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;

        
        }catch (error) {
            console.error("Error hashing password:", error);
            throw new Error("Password hashing failed");
        }
    } 


const verifyOtp = async (req, res) =>{
    try {
        const {otp} = req.body;
        console.log("verifyOtp",otp);

        if(otp == req.session.userOtp){
            
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
          

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                
        })
        
        await saveUserData.save();
        req.session.user = saveUserData;

        
        
        
        res.json({success: true, redirectUrl: "/"})
    }else {
        res.status(400).json({success: false, message: "Invalid OTP, Please try again"})
    }
        
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({success: false, message: "An error occurred"});
    }
}

const resendOtp = async (req, res) =>{
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success: false, message: "Email no found in session"})
        }
        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);        // using nodemailer send the user email and send otp to the user mail from the mail mentioned in nodemailer

        if(emailSent){
            console.log("Resend OTP:", otp);
            res.status(200).json({success: true, message: "OTP Resend Successfully"})
        }else{
            res.status(500).json({success: false, message: "Failed to resend OTP. Please try again"});
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({success: false, message: "Internal Server Error. Please try again"});
    }
}

const successGoogleLogin = (req,res)=>{
    
    req.session.passport = req.user;
    res.redirect("/")

}

const failureGoogleLogin = (req,res)=>{
    res.send("error")
}



const sendResetPasswordEmail = async(name,email,token) =>{
    try {
        console.log("sendResetPasswordEmail",token);
        
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject:"For Reset Password",
            html:`<p>Hii ${name} please click here to 
                           <a href="http://localhost:3000/resetPassword?token=${token}">Reset</a>
                        your password</p>`
        })

        return info.accepted.length > 0              //an array of email addresses that the SMTP server accepted for delivery.

    } catch (error) {
        console.log("Sent verification email error",error.message);
        return false;
    }
}

const forgotPassword = async(req,res)=>{
    try {
        res.render("forgotPassword",{message:""});
    } catch (error) {
        console.log("Forgot password logic error",error.message);
        return res.status(404).redirect("/pageNotFound");
    }
}




const forgotVerify = async(req,res) =>{
    try {
        const email = req.body.email;
        const user = await User.findOne({email});
        console.log("changePassword", user, email);
        

        if(user){
            const randomString = randomstring.generate();
            await User.updateOne({email},{$set:{token:randomString}});

            sendResetPasswordEmail(user.name, user.email, randomString);

            res.render("forgotPassword", {message:"Please check your mail to  reset your password"});


        }else{
            res.render("forgotPassword",{message:"User Email is incorrect"});

        }
    } catch (error) {
        console.log("Forgot verify error", error.message);
        return res.status(404).redirect("/pageNotFound")
    }
}

const changePassword = async(req,res)=>{
    try {
        const errors = {};
        res.render("changePassword", { errors });
    } catch (error) {
        console.log("change password logic error",error);
        return res.status(404).redirect("/pageNotFound");
    }
}

const changeVerify = async(req,res) =>{
    try {
        const { email, oldPassword, newPassword, cpassword } = req.body;
        const errors = {};

        //Email validation with regex
        const emailPattern = /^([a-zA-Z0-9._-]+)@([a-zA-Z0-9]+)\.([a-zA-Z]{2,4})$/;
        if (!emailPattern.test(email)) {
          errors.email = "Please enter a valid email address";
        }
        const user = await User.findOne({ email });

        if(!user) {
            errors.email = "User email is incorrect";
        } else {
            // Old password check
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if(!isMatch) {
                errors.oldPassword = "Old password is incorrect";
            }

            // Password Regex check
            const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if(!passwordPattern.test(newPassword)) {
                errors.newPassword = "Password must be at least 8 characters and contain both letters and numbers";
            }

            if(newPassword !== cpassword){
                errors.cpassword = "Password do not match";
            }
        }

        if (Object.keys(errors).length > 0) {
            return res.render("changePassword", { errors, oldData: req.body });
        }

        //update password
        const hashedPassword = await securePassword(newPassword);
        await User.updateOne({ email }, { $set: { password: hashedPassword, token: "" } });
        

        res.redirect("/login");
    } catch (error) {
        console.log("change verify error", error);
        return res.status(404).redirect("/pageNotFound")
    }
}

const resetPasswordLoad = async(req, res) =>{
    try {
        const token = req.query.token;
        const tokenData = await User.findOne({token});
        console.log("resetPassword",token);
        console.log("resetPassword2",tokenData);

        if(tokenData){
            res.render("resetPassword",{user_id:tokenData._id} )
        }else{
            res.render("page-404",{message:"Token is invalid"});
        }
    } catch (error) {
        console.log("forget password reset page load error", error.message);
        return res.status(404).redirect('/pageNotFound');
        
    }
}

const verifyResetPassword = async(req, res) =>{
    try {
        const password = req.body.password;
        const user_id = req.body.user_id;

        const securepassword = await securePassword(password);
        await User.findByIdAndUpdate({_id:user_id},{$set:{password:securepassword,token:""}});

        res.redirect("/login");
    } catch (error) {
        console.log("verify reset password error", error.message);

        return res.status(404).redirect('/pageNotFound');
    }
}


module.exports = {loadSignup,
                  signup, 
                  verifyOtp,
                  resendOtp,
                  successGoogleLogin,
                  failureGoogleLogin,
                  sendResetPasswordEmail,
                  forgotPassword,
                  forgotVerify,
                  resetPasswordLoad,
                  verifyResetPassword,
                  changePassword,
                  changeVerify


}