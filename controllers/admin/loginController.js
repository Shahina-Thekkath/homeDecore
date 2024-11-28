const User = require("../../models/userSchma");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const loadLogin = (req, res) =>{
    try {
        console.log("Hhi");
        res.render("adminlogin")

    } catch (error) {
        res.redirect("/pageNotFound");
    }

    
    
}

const login = async (req, res) =>{
    try {
           const {email, password} = req.body;

           const validateEmail = (email) => {
            return String(email)
                .toLowerCase()
                .match(
                    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                );
        };


        const validationErrors = {};

        if (!validateEmail(email||email==="")) {
            validationErrors.invalidEmail = "Invalid email ";
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.render('adminlogin',  validationErrors );
        }

           const admin = await User.findOne({email, is_admin:true});
           if(admin){
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if(passwordMatch){
                req.session.admin = admin;
                return res.redirect("/admin/dashboard");
            }else{
                return res.render("adminlogin", {message: "Email and password is incorrect"})
            }
           }else{
            return res.render("adminlogin", {message: "Email and password is incorrect"})
           }
    } catch (error) {
        console.log("login error", error);
        return res.redirect("/pageerror");
        
    }
}




module.exports ={
                loadLogin,
                login
}