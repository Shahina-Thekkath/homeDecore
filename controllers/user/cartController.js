const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");

const loadCart = async(req, res) =>{
    try {
           console.log("req.body cart",req.body);
           
       
           const userId = req.session.user._id;
           const cart = await Cart.findOne({userId}).populate("items.productId");

           if(!cart || cart.items.length === 0){
            return res.render("cart",{cartItems:[], grandTotal: 0});
           }

           const cartItems = cart.items.map((item) =>({
                _id : item._id,
                productId: item.productId,
                name: item.productId.name,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price*item.quantity
           }));
           

           const grandTotal = cartItems.reduce((total, item) => total + item.subtotal, 0);

           res.render("cart", { cartItems, grandTotal});

    } catch (error) {
        console.error("Error laoding cart page:", error);
        res.status(500).send("Internal Server Error");
    }
};

const updateCartTotals = async (req, res) =>{
    try {
        const {productId, quantity} = req.body;
       
    
        if(!productId || !quantity){
            return res.status(400).json({ error: "Invalid request"});
        }

        const userId = req.session.user._id;    
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        
        if(!cart){
            return res.status(404).json({ error: "Cart not found"});
        }

        const item = cart.items.find((item) => item.productId._id.toString() === productId);

        if(!item){
            return res.status(404).json({ error:"Product not found in cart"});
        }

       // Check if the requested quantity exceeds available stock
       let updatedQuantity = parseInt(quantity, 10);
       if (updatedQuantity > item.productId.quantity) {
        updatedQuantity = item.productId.quantity; // Reset to maximum available stock
        return res.status(400).json({ error: "Requested quantity exceeds available stock" });
    }

        
        item.quantity = updatedQuantity;
        const subtotal = item.productId.price * item.quantity;


     
       

        // Recalculate the grand total
            const grandTotal = cart.items.reduce(
            (total, item) => total + item.price * item.quantity, 0);

            console.log("updatefunc",subtotal, grandTotal);

            await cart.save();
            

        // Send the updated subtotals and grand total to the frontend
        return res.json({ subtotal, grandTotal, updatedQuantity});

    } catch (error) {
        console.error("Error updating cart totals:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
};


const addToCart = async(req, res) =>{
    const {productId, quantity} = req.body;
    try {

        const product = await Product.findById(productId);
        if(!product){
            return res.status(404).json({error: "Product not found"});
        }

        //check stock
        if(quantity > product.quantity){
            return res.status(400).json({error: "Requested quantity exceeds stock"});
        }

        //deduct stock in the product schema
        product.quantity -= quantity;
        await product.save();
        
        //find or create the user's cart
        let cart = await Cart.findOne({ userId: req.session.user._id});
        if(!cart){
           cart = new Cart({userId: req.session.user._id, items: []});
        }

        //check if product already exists in the cart
        const itemIndex = cart.items.findIndex((item) => item.productId.equals(productId));
        if(itemIndex > -1){
            //update quantity if product already exists in cart
            cart.items[itemIndex].quantity = quantity;
        }else{
            const price = product.price;
            //add new product to the cart
            cart.items.push({productId, quantity, price});
        }

        await cart.save();

        return res.status(200).json({message: "Product added to cart", cart});
     
    } catch (error) {
       console.error(error);
       return res.status(500).json({ error: "Server Errro"}); 
    }
};


const getCartItemCount = async (req, res) => {
    try {
        const userId = req.session.user._id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.json({ itemCount: 0 });
        }

        // Calculate total quantity of items
        const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

        res.json({ itemCount });
    } catch (error) {
        console.error("Error fetching cart item count:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const deleteCartItem = async(req, res) =>{
    try {

        const userId = req.session.user._id;
     
        const itemId = req.params.id;
        const cart = await Cart.findOne({userId}).populate("items.productId");


        const item =  cart.items.id(itemId);

         cart.items.pull(item);
        await cart.save();

        return res.status(200).json({ok:true});

    } catch (error) {
        console.error("Error deleting cart item :", error);
        res.status(500).json({ error: "Internal Server Error" });
        
    }
}




module.exports = {loadCart,
                updateCartTotals,
                addToCart,
                getCartItemCount,
                deleteCartItem
};

