const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const ProductOffer = require('../../models/productOfferSchema');
const CategoryOffer = require('../../models/categoryOfferSchema');

const loadCart = async(req, res) =>{
    try {
           const userId = req.session.user?._id || req.session.passport._id;
           const user = await User.findById(userId);
           const cart = await Cart.findOne({userId}).populate("items.productId");

           if(!cart || cart.items.length === 0){
            return res.render("emptyCart", {user});
           }

            const cartItems = cart && cart.items && cart.items.length > 0
                ? cart.items.map((item) => {
                  const priceToUse = item.discountedPrice;
                  return {
                    _id: item._id,
                    productId: item.productId,
                    name: item.productId.name,
                    price: item.price,
                    discountedPrice: item.discountedPrice,
                    quantity: item.quantity,
                    subtotal: priceToUse * item.quantity
                }
            }) : [];
           

           const grandTotal = cartItems.reduce((total, item) => total + item.subtotal, 0);
           
           res.render("cart", { cart, cartItems, grandTotal, user});

    } catch (error) {
        console.error("Error loading cart page:", error);
        res.status(500).send("Internal Server Error");
    }
};

const updateCartTotals = async (req, res) =>{
    try {
        const {productId, quantity} = req.body;
       
    
        if(!productId || !quantity){
            return res.status(400).json({ error: "Invalid request"});
        }

        const userId = req.session.user?._id || req.session.passport._id;    
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
    }

    if (updatedQuantity < 1) {
        updatedQuantity = 1;
        }

        
        item.quantity = updatedQuantity;
        const subtotal = item.discountedPrice * item.quantity;


     
       

        // Recalculate the grand total
            const grandTotal = cart.items.reduce(
            (total, item) => total + item.discountedPrice * item.quantity, 0);


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

        if (quantity > 5) {
         return res.status(400).json({ error: "You can’t add more than 5 items per product" });
        }


        const basePrice = product.price;

        // ====== OFFER CHECK START ======
      
        let discountAmount = 0;
        let finalPrice = basePrice;

        // Product offer
        const productOffer = await ProductOffer.findOne({
            productId: product._id,
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        // Category offer
        const categoryOffer = await CategoryOffer.findOne({
            categoryId: product.categoryId,
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        let productDiscountValue = 0;
        if (productOffer) {
            if (productOffer.discountType === "percentage") {
                productDiscountValue = (basePrice * productOffer.discountAmount) / 100;
            } else {
                productDiscountValue = productOffer.discountAmount;
            }
        }

        let categoryDiscountValue = 0;
        if (categoryOffer) {
            if (categoryOffer.discountType === "percentage") {
                categoryDiscountValue = (basePrice * categoryOffer.discountAmount) / 100;
            } else {
                categoryDiscountValue = categoryOffer.discountAmount;
            }
        }

        // Choose better discount
        discountAmount = Math.max(productDiscountValue, categoryDiscountValue);
   // Ensure finalPrice is always set

        if (discountAmount === 0) {
    finalPrice = product.price * quantity;
}

        finalPrice = basePrice - discountAmount;
        if (finalPrice < 0) {
            finalPrice = 0;
        } // prevent negative price
        
        //find or create the user's cart
        let userId = req.session.user?._id || req.session.passport?._id ;
        
        if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }
        
        
        let cart = await Cart.findOne({ userId});
        if(!cart){
           cart = new Cart({userId, items: []});
        }

        //check if product already exists in the cart
        const itemIndex = cart.items.findIndex((item) => item.productId.equals(productId));
        if(itemIndex > -1){
            //update quantity if product already exists in cart
            cart.items[itemIndex].quantity += quantity;
            cart.items[itemIndex].price = basePrice;
            cart.items[itemIndex].discountAmount = discountAmount;
            cart.items[itemIndex].discountedPrice = finalPrice;

        }else{
              cart.items.push({
                productId,
                quantity,
                price: basePrice,
                discountAmount: discountAmount,  // offer 
                discountedPrice: finalPrice    // here discountedAmount would be the amount after discount if there is a discount or else will be the amount without discount if there is no discount
            });
        }

        await cart.save();


        return res.status(200).json({success: true, message: "Product added to cart", cart});
     
    } catch (error) {
       console.error("Error Loading Cart", error);
       return res.status(500).json({ error: "Server Error"}); 
    }
};


const getCartItemCount = async (req, res) => {
    try {
        const userId = req.session.user._id || req.session.passport._id;

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

        const userId = req.session.user._id || req.session.passport._id;
     
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

