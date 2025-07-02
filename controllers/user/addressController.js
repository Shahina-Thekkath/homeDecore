const session = require("express-session");
const User = require("../../models/userSchma");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");


const getAddress = async(req, res) =>{
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).populate('addresses');
       
        // const cart = await Cart.findOne({userId});

        

        // const cartItems = cart && cart.items && cart.items.length > 0
        // ? cart.items.map(item => ({
        //     _id: item._id,
        //     productId: item.productId,
        //     name: item.productId?.name || "Product Removed",
        //     price: item.price,
        //     quantity: item.quantity,
        //     subtotal: item.quantity * item.price
        // })) : [];

        
        
        

        // const grandTotal = cartItems.reduce((total, item) => total + item.subtotal, 0);
        

        res.render('addressBook', {user:user,addresses:user.addresses.sort((a,b) => new Date(b.createdAt)- new Date(a.createdAt)) || []});
    }catch(error){
        console.error("Error Fetching addresses",error);
        res.status(500).render("page-404");
    }
};

const loadAddAddress = async(req, res)=>{
    try {
        const userId = req.session.user._id;
        
        const user = await User.findById(userId);
        const {from} = req.query;
         

        if(!user){
            return res.redirect("/login");
        }

        const address = {};

         res.render('addAddress', {user, address, from})
    } catch (error) {
        console.log("Error loading add Address page", error);
         res.status(500).send("Internal server error");
        
    }
};


const addAddress = async(req, res) =>{
    try {
       
        
        const userId = req.session.user._id;
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
            return res.status(404).send("user not found");
        }

        user.addresses.push(newAddress);
        await user.save();

        return res.status(200).json({ message: "Address added successfully!" });

        return res.redirect('/userAddress');
    } catch (error) {
        console.error("Error Adding Address", error);
        return res.status(500).json({ message: 'Server error!' }); 
    }
};

const loadEditAddress = async(req,res) =>{
    try {
        const userId = req.session.user._id;
        const addressId = req.params.addressId;
        const user = await User.findById(userId);
        const from = req.query.from; // Get the origin page
     
        
        
        if(!user){
            return res.status(404).send("User not found");
        }

        const address = await user.addresses.id(addressId);
      

        if(!address){
            return res.status(404).send("Address not found");
        }

        res.render('editAddress',{user,address, from});
    } catch (error) {
        console.log("Error Fetching Address",error);
        res.status(500).render('pageNotFound');
    }
}

const editAddress = async(req, res) =>{
   try {
    
    
    
    const userId = req.session.user._id;
    const addressId = req.params.addressId;
    
    
    
    const {name, locality, phone, address, country, state, city, pincode} = req.body;
    
    if (!name || !locality || !phone || !address || !country || !state || !city || !pincode) {
        return res.status(400).json({message:"All fields are required"});
    }

    const user = await User.findById(userId);
    const addresstoUpdate = user.addresses.id(addressId);
    

    if(!user){
        return res.status(404).json({message:"User not found"});
    }

    if (!addresstoUpdate) {
        console.error('Address not found');
        return res.status(404).json({message:"Address not found"});
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
      return res.status(500).json({message:"Internal server Error"});
      
   }    
}; 

const deleteAddress = async(req, res) =>{
    try {
        const userId = req.session.user._id
        const addressId = req.params.id;
    
        const user = await User.findById(userId);
    
        if(!user){
           return res.status(400).json({ok:false,
                message:"User not found"});
        }
    
        const address = user.addresses.id(addressId);
    
        if(!address){
           return res.status(400).json({ok:false,
                message:"address not found"});
        }
    
        await user.addresses.pull(address);
        await user.save();
    
         return res.status(200).json({ok:true});
    
    } catch (error) {
        console.error("Server Error", error);
        return res.status(500).json({message:"Internal Server Error"});
        
    }

   

}


module.exports = {getAddress,
                  loadAddAddress,
                  addAddress,
                  loadEditAddress,
                  editAddress,
                  deleteAddress
                  
};

