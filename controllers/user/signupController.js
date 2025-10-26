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
                           <a href="http://localhost:${process.env.PORT}/resetPassword?token=${token}">Reset</a>
                        your password</p>`
        })

        console.log("sendReset", info);
        

        return info.accepted.length > 0              //an array of email addresses that the SMTP server accepted for delivery.

    } catch (error) {
        console.error("Sent verification email error",error.message);

        // Detect common cases
        let reason = "Failed to send reset email. Please try again later.";
        if (error.code === 'ENOTFOUND' || error.code === 'EENVELOPE') {
        reason = "Invalid or unreachable email address.";
        } else if (error.responseCode === 550) {
        reason = "The email address does not exist.";
        }

        return { success: false, reason };
        }
}

const forgotPassword = async(req,res)=>{
    try {
        res.render("forgotPassword",{message:""});
    } catch (error) {
        console.error("Forgot password logic error",error.message);
        return res.status(404).redirect("/pageNotFound");
    }
}




const forgotVerify = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.render("forgotPassword", { message: "Email address not found." });
    }

    const randomString = randomstring.generate();
    await User.updateOne({ email }, { $set: { token: randomString } });

    const mailResult = await sendResetPasswordEmail(user.name, user.email, randomString);
    console.log("mailResult", mailResult);
    
    if (mailResult) {
      res.render("forgotPassword", {
        message: "Password reset email sent. Please check your inbox.",
      });
    } else {
      res.render("forgotPassword", {
        message: mailResult.reason || "Failed to send reset email.",
      });
    }

  } catch (error) {
    console.error("Forgot verify error:", error.message);
    res.status(500).render("forgotPassword", { message: "Internal Server Error. Please try again later." });
  }
};


const changePassword = async(req,res)=>{
    try {
        const userId = req.session.user?._id || req.session.passport._id;
        const user = await User.findById(userId);
        const errors = {};
        res.render("changePassword", { errors , user});
    } catch (error) {
        console.error("change password logic error",error);
        return res.status(404).redirect("/pageNotFound");
    }
}

const changeVerify = async(req, res) => {
    try {
        const { email, oldPassword, newPassword, cpassword } = req.body;
        const errors = {};

          const userId = req.session.user?._id || req.session.passport._id;
        const existingUser = await User.findById(userId);

        // Email validation with regex
        const emailPattern = /^([a-zA-Z0-9._-]+)@([a-zA-Z0-9]+)\.([a-zA-Z]{2,4})$/;
        if (!email || !emailPattern.test(email)) {
            errors.email = "Please enter a valid email address";
        }

        // Check for empty fields
        if (!oldPassword) {
            errors.oldPassword = "Old password is required";
        }
        if (!newPassword) {
            errors.newPassword = "New password is required";
        }
        if (!cpassword) {
            errors.cpassword = "Confirm password is required";
        }

        // If there are validation errors, return early
        if (Object.keys(errors).length > 0) {
            return res.render("changePassword", {user:existingUser, errors, oldData: req.body });
        }

        // Find user only after basic validation passes
        const user = await User.findOne({ email });

        if (!user) {
            errors.email = "User email is incorrect";
        } else {
            // Old password check
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                errors.oldPassword = "Old password is incorrect";
            }

            // Password Regex check
            const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if (!passwordPattern.test(newPassword)) {
                errors.newPassword = "Password must be at least 8 characters and contain both letters and numbers";
            }

            // Check if passwords match
            if (newPassword !== cpassword) {
                errors.cpassword = "Passwords do not match";
            }

            // Check if new password is same as old password
            if (newPassword === oldPassword) {
                errors.newPassword = "New password must be different from old password";
            }
        }

        // Check for errors again after all validations
        if (Object.keys(errors).length > 0) {
            return res.render("changePassword", {user, errors, oldData: req.body });
        }

        // Update password
        const hashedPassword = await securePassword(newPassword);
        await User.updateOne({ email }, { $set: { password: hashedPassword, token: "" } });

        res.redirect("/login");
    } catch (error) {
        console.error("change verify error", error);
        return res.status(500).redirect("/pageNotFound");
    }
}

const resetPasswordLoad = async(req, res) =>{
    try {
        const token = req.query.token;
        const tokenData = await User.findOne({token});

        if(tokenData){
            res.render("resetPassword",{user_id:tokenData._id} )
        }else{
            res.render("page-404",{message:"Token is invalid"});
        }
    } catch (error) {
        console.error("forget password reset page load error", error.message);
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
        console.error("verify reset password error", error.message);

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