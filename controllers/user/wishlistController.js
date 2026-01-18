import mongoose from 'mongoose';
import Wishlist from "../../models/wishlistSchema.js";
import Product from "../../models/productSchema.js";
import ProductOffer from "../../models/productOfferSchema.js";
import CategoryOffer from "../../models/categoryOfferSchema.js";
import { STATUS_CODES, MESSAGES } from "../../constants/index.js";
import logger from "../../utils/logger.js";


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
    logger.error("Error loading wishlist:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.SERVER_ERROR);
  }
};



const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user?._id || req.session.passport;

        const product = await Product.findById(productId);
        if(!product){
            return res.status(STATUS_CODES.NOT_FOUND).json({success: false, message: MESSAGES.PRODUCT.NOT_FOUND});
        }
        
        let wishlist = await Wishlist.findOne({userId});

        if(!wishlist){
           wishlist = new Wishlist({
            userId,
            products: [{productId}]
           });
           await wishlist.save();
           return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.WISHLIST.PRODUCT_ADDED });
        }

        //check if the product already exists
        const alreadyExists = wishlist.products.some(
            (item) => item.productId.toString() === productId
        );

        if(alreadyExists){
            return res.status(STATUS_CODES.OK).json({ error: MESSAGES.WISHLIST.PRODUCT_ALREADY_EXISTS });
        }

        wishlist.products.push({productId});
        await wishlist.save();

        res.json({ success: true, message: MESSAGES.WISHLIST.PRODUCT_ADDED });

    } catch (error) {
        logger.error("Error Adding to wishlist", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.GENERIC.INTERNAL_ERROR });
    }
};

const clearWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.passport._id;

    await Wishlist.findOneAndUpdate(
      { userId },
      { $set: { products: [] } } // empty the products array
    );

    res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.WISHLIST.CLEARED_SUCCESS });
  } catch (error) {
    logger.error("Error clearing wishlist:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.SERVER_ERROR });
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

    res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.WISHLIST.PRODUCT_REMOVED });
  } catch (error) {
    logger.error("Error removing product from wishlist:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.SERVER_ERROR });
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
        return res.status(STATUS_CODES.OK).json({ inWishlist: false });
       }
       
       const wishlist = await Wishlist.findOne({ userId });

       if (!wishlist) {
         return res.status(STATUS_CODES.OK).json({ inWishlist: false });
       }

       // check if product exists in wishlist
       const inWishlist = wishlist.products.some(
        (item) => item.productId.toString() === productId
       );

       res.status(STATUS_CODES.OK).json({ inWishlist });

   } catch (error) {
      logger.error("Error checking wishlist", error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.GENERIC.INTERNAL_ERROR });
      
   }
};



export default {
    getWishlist,
    addToWishlist,
    clearWishlist,
    removeProductFromWishlist,
    getEmptyWishlist,
    checkWishlist
};