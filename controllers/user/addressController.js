const session = require("express-session");
const User = require("../../models/userSchma");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const { STATUS_CODES, MESSAGES } = require("../../constants");


const getAddress = async(req, res) =>{
    try {
        const userId = req.session.user?._id || req.session.passport?._id;
        const user = await User.findById(userId).populate('addresses');
        

        res.render('addressBook', {user:user,addresses:user.addresses.sort((a,b) => new Date(b.createdAt)- new Date(a.createdAt)) || []});
    }catch(error){
        console.error("Error Fetching addresses",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render("page-404");
    }
};

const loadAddAddress = async(req, res)=>{
    try {
        const userId = req.session.user?._id || req.session.passport?._id;
        
        const user = await User.findById(userId);
        const {from} = req.query;
         

        if(!user){
            return res.redirect("/login");
        }

        const address = {};

         res.render('addAddress', {user, address, from})
    } catch (error) {
        console.error("Error loading add Address page", error);
         res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.INTERNAL_ERROR);
        
    }
};


const addAddress = async(req, res) =>{
    try {
       
        
        const userId = req.session.user?._id || req.session.passport?._id;
        const {name, address, city, state, locality, pincode, country, phone} = req.body;

        if (!name || !address || !city || !state || !pincode || !country || !phone) {
            return res.status(400).json({ message: "All fields are required." });
        }
        

        const newAddress ={
            name, 
            address,
            city, 
            state,
            country,
            pincode,
            locality,
            phone
        }

        const user = await User.findById(userId);

        if(!user){
            return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.USER.NOT_FOUND);
        }

        user.addresses.push(newAddress);
        await user.save();

        return res.status(STATUS_CODES.OK).json({ message: MESSAGES.ADDRESS.ADDED });

        return res.redirect('/address');
    } catch (error) {
        console.error("Error Adding Address", error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.GENERIC.SERVER_ERROR }); 
    }
};

const loadEditAddress = async(req,res) =>{
    try {
        const userId = req.session.user?._id || req.session.passport?._id;
        const addressId = req.params.addressId;
        const user = await User.findById(userId);
        const from = req.query.from; // Get the origin page
     
        
        
        if(!user){
            return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.USER.NOT_FOUND);
        }

        const address = await user.addresses.id(addressId);
      

        if(!address){
            return res.redirect('/address');
        }

        res.render('editAddress',{user,address, from});
    } catch (error) {
        console.error("Error Fetching Edit Address",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('pageNotFound');
    }
}

const editAddress = async(req, res) =>{
   try {
    
    
    
    const userId = req.session.user?._id || req.session.passport?._id;
    const addressId = req.params.addressId;
    
    
    
    const {name, locality, phone, address, country, state, city, pincode} = req.body;
    
    if (!name || !locality || !phone || !address || !country || !state || !city || !pincode) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.VALIDATION.ALL_FIELDS_REQUIRED });
    }

    const user = await User.findById(userId);
    const addresstoUpdate = user.addresses.id(addressId);
    

    if(!user){
        return res.status(STATUS_CODES.NOT_FOUND).json({message:MESSAGES.USER.NOT_FOUND});
    }

    if (!addresstoUpdate) {
        console.error('Address not found');
        return res.status(STATUS_CODES.NOT_FOUND).json({message:MESSAGES.ADDRESS.NOT_FOUND});
    }

   addresstoUpdate.name = name;
   addresstoUpdate.locality = locality;
   addresstoUpdate.phone = phone;
   addresstoUpdate.address = address;
   addresstoUpdate.country = country;
   addresstoUpdate.state = state;
   addresstoUpdate.city = city;
   addresstoUpdate.pincode = pincode;
    
   await user.save();

   return res.json({ok:true});


   } catch (error) {
      console.error("Error updating address", error);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.GENERIC.INTERNAL_ERROR});
      
   }    
}; 

const deleteAddress = async(req, res) =>{
    try {
        const userId = req.session.user?._id || req.session.passport?._id;
        const addressId = req.params.id;
    
        const user = await User.findById(userId);
    
        if(!user){
           return res.status(STATUS_CODES.BAD_REQUEST).json({ok:false,
                message:MESSAGES.USER.NOT_FOUND});
        }
    
        const address = user.addresses.id(addressId);
    
        if(!address){
           return res.status(STATUS_CODES.BAD_REQUEST).json({ok:false,
                message: MESSAGES.USER.NOT_FOUND});
        }
    
        await user.addresses.pull(address);
        await user.save();
    
         return res.status(STATUS_CODES.OK).json({ok:true});
    
    } catch (error) {
        console.error("Server Error", error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.GENERIC.INTERNAL_ERROR});
        
    }

   

}


module.exports = {getAddress,
                  loadAddAddress,
                  addAddress,
                  loadEditAddress,
                  editAddress,
                  deleteAddress
                  
};

