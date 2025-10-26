const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const ProductOffer = require('../../models/productOfferSchema');
const CategoryOffer = require('../../models/categoryOfferSchema');
const Wishlist = require("../../models/wishlistSchema");

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


const addToCart = async (req, res) => {
  const { productId, quantity, fromWishlist } = req.body;

  try {
    const product = await Product.findById(productId).populate("categoryId");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Stock check
    if (quantity > product.quantity) {
      return res.status(400).json({ error: "Requested quantity exceeds stock" });
    }

    if (quantity > 5) {
      return res.status(400).json({ error: "You can’t add more than 5 items per product" });
    }

    const currentDate = new Date();
    const basePrice = product.price;
    let bestPrice = basePrice;
    let discountInfo = null;

    // ====== FETCH ALL ACTIVE OFFERS ======
    const [productOffers, categoryOffers] = await Promise.all([
      ProductOffer.find({
        productId: product._id,
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
      }),
      CategoryOffer.find({
        categoryId: product.categoryId._id,
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
      }),
    ]);

    // ====== HELPER FUNCTION ======
    const getBestOffer = (offers) => {
      let best = { finalPrice: basePrice, offer: null };
      for (const offer of offers) {
        let discounted = basePrice;

        if (offer.discountType === "percentage") {
          discounted = basePrice - (basePrice * offer.discountAmount) / 100;
        } else if (offer.discountType === "flat") {
          discounted = basePrice - offer.discountAmount;
        }

        discounted = Math.max(discounted, 0); // prevent negative
        if (discounted < best.finalPrice) {
          best = { finalPrice: discounted, offer };
        }
      }
      return best;
    };

    // ====== COMPARE OFFERS ======
    const bestProductOffer = getBestOffer(productOffers);
    const bestCategoryOffer = getBestOffer(categoryOffers);

    if (bestProductOffer.finalPrice < bestCategoryOffer.finalPrice) {
      bestPrice = bestProductOffer.finalPrice;
      discountInfo = {
        source: "product",
        type: bestProductOffer.offer?.discountType,
        amount: bestProductOffer.offer?.discountAmount,
      };
    } else if (bestCategoryOffer.offer && bestCategoryOffer.finalPrice < basePrice) {
      bestPrice = bestCategoryOffer.finalPrice;
      discountInfo = {
        source: "category",
        type: bestCategoryOffer.offer?.discountType,
        amount: bestCategoryOffer.offer?.discountAmount,
      };
    }

    const discountAmount = basePrice - bestPrice;

    // ====== CART LOGIC ======
    const userId = req.session.user?._id || req.session.passport?._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if product exists in cart
    const itemIndex = cart.items.findIndex((item) => item.productId.equals(productId));

    if (itemIndex > -1) {
      // Update existing item
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].price = basePrice;
      cart.items[itemIndex].discountAmount = discountAmount;
      cart.items[itemIndex].discountedPrice = bestPrice;
    } else {
      // Add new item
      cart.items.push({
        productId,
        quantity,
        price: basePrice,
        discountAmount,
        discountedPrice: bestPrice,
      });
    }

    await cart.save();

    // Remove from wishlist if added from there
    if (fromWishlist) {
      await Wishlist.updateOne({ userId }, { $pull: { products: { productId } } });
    }

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    console.error("Error Loading Cart:", error);
    return res.status(500).json({ error: "Server Error" });
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

        return res.status(200).json({ success: true, message: "Item deleted successfully" });


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

