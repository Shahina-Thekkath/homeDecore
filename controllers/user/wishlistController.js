const mongoose = require('mongoose');
const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');
const ProductOffer = require('../../models/productOfferSchema');
const CategoryOffer = require('../../models/categoryOfferSchema');

const getWishlist = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport;
    const userId = user._id;

    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: "products.productId",
        populate: { path: "categoryId", select: "name" },
      });

    if (!wishlist || wishlist.products.length === 0) {
      return res.render("emptyWishlist", { user });
    }

    const now = new Date();

    const productsWithDiscount = await Promise.all(
      wishlist.products.map(async (item) => {
        const product = item.productId;
        const originalPrice = product.price;
        let bestPrice = originalPrice;
        let discountInfo = null;

        // ===== Fetch all active offers (product + category) =====
        const [productOffers, categoryOffers] = await Promise.all([
          ProductOffer.find({
            productId: product._id,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
          }),
          CategoryOffer.find({
            categoryId: product.categoryId._id,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
          }),
        ]);

        // ===== Helper function to find best discount =====
        const getBestOffer = (offers) => {
          let best = { finalPrice: originalPrice, offer: null };
          for (const offer of offers) {
            let discounted = originalPrice;
            if (offer.discountType === "percentage") {
              discounted = originalPrice - (originalPrice * offer.discountAmount) / 100;
            } else if (offer.discountType === "flat") {
              discounted = originalPrice - offer.discountAmount;
            }

            discounted = Math.max(discounted, 0);
            if (discounted < best.finalPrice) {
              best = { finalPrice: discounted, offer };
            }
          }
          return best;
        };

        // ===== Compare best product & category offers =====
        const bestProductOffer = getBestOffer(productOffers);
        const bestCategoryOffer = getBestOffer(categoryOffers);

        if (bestProductOffer.finalPrice < bestCategoryOffer.finalPrice) {
          bestPrice = bestProductOffer.finalPrice;
          discountInfo = {
            source: "product",
            type: bestProductOffer.offer?.discountType,
            amount: bestProductOffer.offer?.discountAmount,
          };
        } else if (bestCategoryOffer.offer && bestCategoryOffer.finalPrice < originalPrice) {
          bestPrice = bestCategoryOffer.finalPrice;
          discountInfo = {
            source: "category",
            type: bestCategoryOffer.offer?.discountType,
            amount: bestCategoryOffer.offer?.discountAmount,
          };
        }

        const discountAmount = originalPrice - bestPrice;
        const discountPercent =
          discountInfo?.type === "percentage" ? discountInfo.amount : 0;

        return {
          ...item.toObject(),
          originalPrice,
          finalPrice: bestPrice.toFixed(2),
          discountAmount: discountAmount > 0 ? discountAmount.toFixed(2) : null,
          discountType: discountInfo?.type || null,
          discountSource: discountInfo?.source || null,
          discountPercent,
        };
      })
    );

    return res.render("wishlist", { wishlist: productsWithDiscount, user });
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.status(500).send("Server error");
  }
};



const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user?._id || req.session.passport;

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
            return res.status(200).json({ error: "Product already in wishlist" });
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
    const userId = req.session.user?._id || req.session.passport._id;

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
    const userId = req.session.user?._id || req.session.passport._id;
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


const checkWishlist = async (req, res) => {
   try {
       const { productId } = req.params;
       const userId = req.session.user?._id || req.session.passport;

       if (!userId) {
        console.log("no user Id, checkWishlist");
        
        return res.status(200).json({ inWishlist: false });
       }
       
       const wishlist = await Wishlist.findOne({ userId });

       if (!wishlist) {
         return res.status(200).json({ inWishlist: false });
       }

       // check if product exists in wishlist
       const inWishlist = wishlist.products.some(
        (item) => item.productId.toString() === productId
       );

       res.status(200).json({ inWishlist });

   } catch (error) {
      console.error("Error checking wishlist", error);
      res.status(500).json({ error: "Internal Server Error" });
      
   }
};



module.exports = {
    getWishlist,
    addToWishlist,
    clearWishlist,
    removeProductFromWishlist,
    getEmptyWishlist,
    checkWishlist
};