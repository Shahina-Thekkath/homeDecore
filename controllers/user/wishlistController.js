const mongoose = require('mongoose');
const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');
const ProductOffer = require('../../models/productOfferSchema');
const CategoryOffer = require('../../models/categoryOfferSchema');

const getWishlist = async (req, res) => {
    try {
        const user = req.session.user;
        const userId = req.session.user._id;
        const wishlist = await Wishlist.findOne({ userId })
            .populate({
                path: 'products.productId',
                populate: { path: 'categoryId', select: 'name' }
            });

        if (!wishlist || wishlist.products.length === 0) {
      return res.render("emptyWishlist", { user});
    }

    const now = new Date();

    // Loop through wishlist items and calculate offers
   const productsWithDiscount = await Promise.all(
            wishlist.products.map(async (item) => {
                const product = item.productId;
                let finalPrice = product.price;
                let discountAmount = 0;
                let discountType = null; // NEW - track which type was applied
                let discountPercent = 0;

                // 1️⃣ Product-level offer
                let productDiscount = 0;
                const productOffer = await ProductOffer.findOne({
                    productId: product._id,
                    isActive: true,
                    startDate: { $lte: now },
                    endDate: { $gte: now }
                });

                if (productOffer) {
                    if (productOffer.discountType === "flat") {
                        productDiscount = productOffer.discountAmount;
                    } else if (productOffer.discountType === "percentage") {
                        discountPercent = productOffer.discountAmount;
                        productDiscount = (product.price * productOffer.discountAmount) / 100;
                    }
                }

                // 2️⃣ Category-level offer
                let categoryDiscount = 0;
                const categoryOffer = await CategoryOffer.findOne({
                    categoryId: product.categoryId._id,
                    isActive: true,
                    startDate: { $lte: now },
                    endDate: { $gte: now }
                });

                if (categoryOffer) {
                    if (categoryOffer.discountType === "flat") {
                        categoryDiscount = categoryOffer.discountAmount;
                    } else if (categoryOffer.discountType === "percentage") {
                        discountPercent = categoryOffer.discountAmount;
                        categoryDiscount = (product.price * categoryOffer.discountAmount) / 100;
                    }
                }

                // 3️⃣ Apply the bigger discount & set type
                if (productDiscount >= categoryDiscount && productDiscount > 0) {
                    discountAmount = productDiscount;
                    discountType = productOffer.discountType;
                } else if (categoryDiscount > productDiscount) {
                    discountAmount = categoryDiscount;
                    discountType = categoryOffer.discountType;
                }

                // 4️⃣ Final price
                finalPrice = Math.max(product.price - discountAmount, 0);

                return {
                    ...item.toObject(),
                    discountAmount: discountAmount > 0 ? discountAmount : null,
                    discountType, // send type to frontend
                    finalPrice,
                    originalPrice: product.price,
                    discountPercent
                };
            })
        );

        return res.render("wishlist", { wishlist: productsWithDiscount, user });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};


const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user._id;

        const product = await Product.findById(productId);
        if(!product){
            return res.status(404).json({success: false, message: "Product not found"});
        }
        
        let wishlist = await Wishlist.findOne({userId});

        if(!wishlist){
           wishlist = new Wishlist({
            userId,
            products: [{productId}]
           });
           await wishlist.save();
           return res.status(200).json({ success: true, message: "Product added to wishlist" });
        }

        //check if the product already exists
        const alreadyExists = wishlist.products.some(
            (item) => item.productId.toString() === productId
        );

        if(alreadyExists){
            return res.status(400).json({ error: "Product already in wishlist" });
        }

        wishlist.products.push({productId});
        await wishlist.save();

        res.json({ success: true, message: "Product added to wishlist" });

    } catch (error) {
        console.error("Error Adding to wishlist", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const clearWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    await Wishlist.findOneAndUpdate(
      { userId },
      { $set: { products: [] } } // empty the products array
    );

    res.status(200).json({ success: true, message: "Wishlist cleared successfully" });
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeProductFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { id } = req.params; // assuming productId comes from URL

    await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { products: { productId: new mongoose.Types.ObjectId(id) } } } // remove matching product
    );

    res.status(200).json({ success: true, message: "Product removed from wishlist" });
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getEmptyWishlist = (req, res) => {
    res.render("emptyWishlist", { user: req.session.user });
};



module.exports = {
    getWishlist,
    addToWishlist,
    clearWishlist,
    removeProductFromWishlist,
    getEmptyWishlist
};