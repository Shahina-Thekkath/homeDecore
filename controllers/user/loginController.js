
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

};


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
         if(email === "") {
            validationErrors.invalidEmail = "Email is required";
         } else if (!validateEmail(email)) {
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

            // Check if password is empty
            if (!password || password.trim() === "") {
                return res.render("login", { invalidPassword: "Password field cannot be empty", email });
            }
    
            // Compare passwords
            const passwordMatch = await bcrypt.compare(password, findUser.password);
            if (!passwordMatch) {
                return res.render("login", { invalidPassword: "Incorrect Password", email });
            }
        
        // Set user session
        if (req.session.user !== undefined) {
        req.session.user = findUser;
        } else {
        req.session.passport = { user: findUser };
        }
        res.redirect("/");
     } 
    }
    catch (error) {
        console.error("Login error", error);
        
    }
    // Redirect to home after successful session save
    
};


module.exports = {loadLogin,
                  login
};