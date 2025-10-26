
const Product = require("../../models/productSchema");
const CategoryOffer = require('../../models/categoryOfferSchema');
const ProductOffer = require('../../models/productOfferSchema');


const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport;
    const currentDate = new Date();

    const products = await Product.find({ isBlocked: false })
      .populate("categoryId")
      .limit(20)
      .lean();

    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        const originalPrice = product.price;
        let bestPrice = originalPrice;
        let discountInfo = null;

        // Fetch all active offers for this product and its category
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

        // Helper: calculate the best price from a list of offers
        const getBestOffer = (offers) => {
          let best = { finalPrice: originalPrice, offer: null };

          for (const offer of offers) {
            let discounted = originalPrice;
            if (offer.discountType === "percentage") {
              discounted = originalPrice - (originalPrice * offer.discountAmount) / 100;
            } else if (offer.discountType === "flat") {
              discounted = originalPrice - offer.discountAmount;
            }

            discounted = Math.max(discounted, 0); // prevent negative

            if (discounted < best.finalPrice) {
              best = { finalPrice: discounted, offer };
            }
          }

          return best;
        };

        // Find best product-level and category-level offer
        const bestProductOffer = getBestOffer(productOffers);
        const bestCategoryOffer = getBestOffer(categoryOffers);

        // Compare which offer gives the lower price
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

        return {
          ...product,
          originalPrice,
          finalPrice: bestPrice.toFixed(2),
          discountInfo,
        };
      })
    );

    // Render home page
    if (user) {
      return res.render("home", { user, products: updatedProducts });
    } else {
      return res.render("home", { products: updatedProducts });
    }
  } catch (error) {
    console.error("Error loading home page:", error);
    res.status(500).send("Server error");
  }
};



module.exports = {
    loadHomepage
    
}
    
