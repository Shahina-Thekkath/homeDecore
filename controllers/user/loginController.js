
const User = require("../../models/userSchma");
const nodemailer = require("nodemailer");
const env = require('dotenv').config();
const bcrypt = require("bcrypt");
const session = require("express-session");

const loadLogin = async(req, res) =>{
    try{
        const user = req.session.user || req.session.passport;
        if(!user){
            return res.render("login");
        }
        else{
            res.redirect("/");
        }
        
    }catch(error){
        console.error("Error loading login page:", error);
        res.redirect("/pageNotFound");
    }

}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const validateEmail = (email) => {
            return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
        };


        const validationErrors = {};

        if (!validateEmail(email)||email==="") {
            validationErrors.invalidEmail = "Invalid email";
        }

    
       
        if (Object.keys(validationErrors).length > 0) {
            validationErrors.email=email
            return res.render("login", validationErrors);


            
        }else{
        
            const findUser = await User.findOne({ email:email });

            if (!findUser || findUser.is_admin === true) {
                return res.render("login", { message: "User not found", email});
            }
    
            if (findUser.isBlocked) {
                return res.render("login", { message: "User is blocked by admin", email });
            }
    
            // Compare passwords
            const passwordMatch = await bcrypt.compare(password, findUser.password);
            if (!passwordMatch) {
                return res.render("login", { invalidPassword: "Incorrect Password", email });
            }
        
        // Set user session
        req.session.user = findUser;
     
       


        res.redirect("/");
    } 



    }
            

        catch (error) {
            console.error("Login error", error);
           
        }

       
        
        // Redirect to home after successful session save
       
};
// const login=async(req,res)=>{
//     try {

//         const {email,password}=req.body
//         const findUser=await User.findOne({is_admin:0,email:email})
//         if(!findUser){
//             return res.render("login",{message:"User not Found"})
//         }
//         if(findUser.isBlocked){
//             return res.render("login",{message:"User is blocked by the admin"})
//         }
//         const passwordMatch=await bcrypt.compare(password,findUser.password)
//         if(!passwordMatch){
//             return res.render("login",{message:"Incorrect Password"})
//         }
//         req.session.user=findUser
        
//         console.log(req.session.user);
        
//         res.redirect("/")
        
        
//     } catch (error) {
//         console.error("login error",error)
//         res.render("login",{message:"Login failed.Please try again later"})
        
//     }
// }

module.exports = {loadLogin,
                  login
};