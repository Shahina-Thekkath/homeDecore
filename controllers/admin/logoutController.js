const express = require("express");
const session = require("express-session");


const logout = async(req,res)=>{
try {
    req.session.destroy(err =>{
       
        if(err){
            console.log("Error destroying session", err);
            return res.redirect("/pageerror");
        }
        res.redirect("/admin/login");

    })
   
    
    } catch (error) {

        console.log("unexpected error during logout", error);
        res.redirect("/pageerror");
        
    }

   
}