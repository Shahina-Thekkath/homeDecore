const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchma");
const Category = require('../../models/categorySchema');
const CategoryOffer = require('../../models/categoryOfferSchema');
const ProductOffer = require('../../models/productOfferSchema');
const { STATUS_CODES, MESSAGES } = require("../../constants");


const loadProductDetails = async (req, res) =>{
    try {
        const productId = req.params.id;
        const user = req.session.user || req.session.passport;
         let cart 
         let grandTotal;

        if(user){
             cart = await Cart.findOne({userId: user._id}).populate({path:"items.productId"});
            
             const cartItems = cart && cart.items && cart.items.length > 0
                ? cart.items.map((item) => {
                  const priceToUse = item.discountAmount && item.discountAmount > 0 ? item.discountedPrice : item.price;
                  return {
                    _id: item._id,
                    productId: item.productId._id,
                    name: item.productId.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: priceToUse * item.quantity
                }
        })
                : [];
    
            grandTotal = cartItems.reduce((total, item) => total + item.subtotal, 0);
           
        }else{

            cart = null;
        }

        
        const currentProduct = await Product.findOne({ 
            _id: productId, 
            isBlocked: false 
        })
        .populate("categoryId")
        .lean();

       

         // ===== COMMON OFFER LOGIC =====
    const getBestDiscount = async (product) => {
      const basePrice = product.price;
      const currentDate = new Date();

      // Fetch all active offers
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

      // Helper to find best offer among multiple
      const getBestOffer = (offers) => {
        let best = { finalPrice: basePrice, offer: null };
        for (const offer of offers) {
          let discounted = basePrice;
          if (offer.discountType === "percentage") {
            discounted = basePrice - (basePrice * offer.discountAmount) / 100;
          } else if (offer.discountType === "flat") {
            discounted = basePrice - offer.discountAmount;
          }

          discounted = Math.max(discounted, 0);
          if (discounted < best.finalPrice) {
            best = { finalPrice: discounted, offer };
          }
        }
        return best;
      };

      const bestProductOffer = getBestOffer(productOffers);
      const bestCategoryOffer = getBestOffer(categoryOffers);

      let discountType = null;
      let discountAmount = 0;
      let bestPrice = basePrice;
      let source = null;

      // Compare product vs category offers
      if (bestProductOffer.finalPrice < bestCategoryOffer.finalPrice) {
        bestPrice = bestProductOffer.finalPrice;
        source = "product";
        discountType = bestProductOffer.offer?.discountType || null;
        discountAmount = bestProductOffer.offer?.discountAmount || 0;
      } else if (
        bestCategoryOffer.offer &&
        bestCategoryOffer.finalPrice < basePrice
      ) {
        bestPrice = bestCategoryOffer.finalPrice;
        source = "category";
        discountType = bestCategoryOffer.offer?.discountType || null;
        discountAmount = bestCategoryOffer.offer?.discountAmount || 0;
      }

      const discountValue = basePrice - bestPrice;

      return {
        source,               // "product" or "category"
        discountType,         // "percentage" or "flat"
        discountAmount,       // amount or percentage
        basePrice,            // original price
        finalPrice: bestPrice, // discounted price
        discountValue,        // actual discount difference
      };
    };

    // ===== APPLY OFFER TO CURRENT PRODUCT =====
    const currentProductOffer = await getBestDiscount(currentProduct);

    // ===== RELATED PRODUCTS WITH OFFERS =====
    const relatedProductsRaw = await Product.find({
      _id: { $ne: productId },
      categoryId: currentProduct.categoryId,
      isBlocked: false,
    })
      .populate("categoryId")
      .lean()
      .limit(8);

    const relatedProducts = await Promise.all(
      relatedProductsRaw.map(async (prod) => {
        const offerData = await getBestDiscount(prod);
        return { ...prod, ...offerData };
      })
    );

    // ===== RENDER =====
    res.render("productDetails", {
      currentProduct: { ...currentProduct, ...currentProductOffer },
      relatedProducts,
      cart,
      grandTotal,
      user,
    });
  } catch (error) {
    console.error("Error while rendering product details page:", error);
    res.redirect("/PageNotFound");
  }
};


const getUserProductList = async (req, res) => {
  try {
   const user = req.session.user || req.session.passport;

    const sort = req.query.sort || 'newest';
    const limit = 9;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const query = { isBlocked: false };
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.aggregate([
      {$match: {isBlocked: false}},
      {$lookup: 
        {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category"
        }
      },
      {$unwind: "$category"},
      {$match: {"category.isBlocked": false}},
      {$sort: {createdAt: -1}},
      {$skip: skip},
      {$limit: limit}
    ]);

    const currentDate = new Date();

    // ===== COMMON OFFER LOGIC =====
    const getBestDiscount = async (product) => {
      const basePrice = product.price;

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

      const getBestOffer = (offers) => {
        let best = { finalPrice: basePrice, offer: null };
        for (const offer of offers) {
          let discounted = basePrice;
          if (offer.discountType === "percentage") {
            discounted = basePrice - (basePrice * offer.discountAmount) / 100;
          } else if (offer.discountType === "flat") {
            discounted = basePrice - offer.discountAmount;
          }

          discounted = Math.max(discounted, 0);
          if (discounted < best.finalPrice) {
            best = { finalPrice: discounted, offer };
          }
        }
        return best;
      };

      const bestProductOffer = getBestOffer(productOffers);
      const bestCategoryOffer = getBestOffer(categoryOffers);

      let discountType = null;
      let discountAmount = 0;
      let bestPrice = basePrice;
      let source = null;

      if (bestProductOffer.finalPrice < bestCategoryOffer.finalPrice) {
        bestPrice = bestProductOffer.finalPrice;
        source = "product";
        discountType = bestProductOffer.offer?.discountType || null;
        discountAmount = bestProductOffer.offer?.discountAmount || 0;
      } else if (
        bestCategoryOffer.offer &&
        bestCategoryOffer.finalPrice < basePrice
      ) {
        bestPrice = bestCategoryOffer.finalPrice;
        source = "category";
        discountType = bestCategoryOffer.offer?.discountType || null;
        discountAmount = bestCategoryOffer.offer?.discountAmount || 0;
      }

      const discountValue = basePrice - bestPrice;

      return {
        source,
        discountType,
        discountAmount,
        basePrice,
        finalPrice: bestPrice,
        discountValue,
      };
    };

    // Apply offer to each product
    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        const offerData = await getBestDiscount(product);
        return {
          ...product,
          originalPrice: offerData.basePrice,
          finalPrice: offerData.finalPrice,
          discountInfo: offerData.source
            ? {
                type: offerData.discountType,
                amount: offerData.discountAmount,
                source: offerData.source,
              }
            : null,
        };
      })
    );

    // //  Aggregate category counts
    // const categoryCounts = await Product.aggregate([
    //   { $match: { isBlocked: false } },
    //   {
    //     $group: {
    //       _id: "$categoryId",
    //       count: { $sum: 1 },
    //     },
    //   },
    // ]);

    // const countsWithNames = await Category.populate(categoryCounts, {
    //   path: "_id",
    //   select: "name",
    // });

    // const categories = countsWithNames.map((item) => ({
    //   name: item._id.name,
    //   count: item.count,
    // }));

    const categories = await Product.aggregate([
      {$match: {isBlocked: false}},
      {$lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category"
      }},
      {$unwind: "$category"},
      {$match: {"category.isBlocked": false}},
      {
        $group: {
          _id: "$category._id",
          name: {$first: "$category.name"},
          count: {$sum: 1}
        }
      },
        {
          $project: {
            _id: 0,
            categoryId: "$_id",
            name: 1,
            count: 1
          }
        },
        {
          $sort: {count: -1}
        }
    ]);

    res.render("userProductList", {
      products: updatedProducts,
      user,
      sort,
      limit,
      totalPages,
      currentPage: page,
      categories,
    });
  } catch (error) {
    console.error("Error loading user product List:", error);
    res.redirect("/PageNotFound");
  }
};


const getFilteredProductList = async (req, res) => {
  try {
    const { sort, category, search } = req.query;
    const limit = parseInt(req.query.limit) || 12;
    const page = parseInt(req.query.page) || 1;

    const query = { isBlocked: false };
    if (category) {
      const catDoc = await Category.findOne({ name: category, isBlocked: false });
      if (catDoc) {
        query.categoryId = catDoc._id;
      } else {
        return res.render('user/productListPartial', {
          products: [],
          totalPages: 0,
          currentPage: 1,
          limit
        });
      }
    }

    let sortOption = { createdAt: -1 };
    switch (sort) {
      case "name_asc":
        sortOption = { name: 1 };
        break;
      case "name_desc":
        sortOption = { name: -1 };
        break;
      case "price_asc":
        sortOption = { price: 1 };
        break;
      case "price_desc":
        sortOption = { price: -1 };
        break;
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch && trimmedSearch.length > 0) {
      const searchRegex = new RegExp(trimmedSearch, "i");
      const parsedPrice = parseInt(search, 10);
      const isValidPrice = !isNaN(parsedPrice);

      const matchedCategory = await Category.findOne({ name: searchRegex });
      if (matchedCategory) {
        query.categoryId = matchedCategory._id;
      } else if (isValidPrice) {
        const minPrice = parsedPrice - parsedPrice * 0.1;
        const maxPrice = parsedPrice + parsedPrice * 0.1;
        query.price = { $gte: minPrice, $lte: maxPrice };
      } else {
        query.name = searchRegex;
      }
    }

    const allProducts = await Product.find(query)
      .populate("categoryId", "name isBlocked")
      .collation({ locale: "en", strength: 2 })
      .sort(sortOption)
      .lean();

    const productsWithActiveCategories = allProducts.filter
    (product => product.categoryId && !product.categoryId.isBlocked);

    console.log(productsWithActiveCategories);
    

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    const safePage =
      page > totalPages && totalPages !== 0
        ? totalPages
        : page < 1
        ? 1
        : page;

    const skip = (safePage - 1) * limit;

    const products = productsWithActiveCategories.slice(skip, skip + limit);

    const currentDate = new Date();

    // ===== REUSE SAME DISCOUNT LOGIC =====
    const getBestDiscount = async (product) => {
      const basePrice = product.price;

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

      const getBestOffer = (offers) => {
        let best = { finalPrice: basePrice, offer: null };
        for (const offer of offers) {
          let discounted = basePrice;
          if (offer.discountType === "percentage") {
            discounted = basePrice - (basePrice * offer.discountAmount) / 100;
          } else if (offer.discountType === "flat") {
            discounted = basePrice - offer.discountAmount;
          }
          discounted = Math.max(discounted, 0);
          if (discounted < best.finalPrice) {
            best = { finalPrice: discounted, offer };
          }
        }
        return best;
      };

      const bestProductOffer = getBestOffer(productOffers);
      const bestCategoryOffer = getBestOffer(categoryOffers);

      let bestPrice = basePrice;
      let discountInfo = null;

      if (bestProductOffer.finalPrice < bestCategoryOffer.finalPrice) {
        bestPrice = bestProductOffer.finalPrice;
        discountInfo = {
          type: bestProductOffer.offer?.discountType,
          amount: bestProductOffer.offer?.discountAmount,
          source: "product",
        };
      } else if (bestCategoryOffer.finalPrice < basePrice) {
        bestPrice = bestCategoryOffer.finalPrice;
        discountInfo = {
          type: bestCategoryOffer.offer?.discountType,
          amount: bestCategoryOffer.offer?.discountAmount,
          source: "category",
        };
      }

      return { finalPrice: bestPrice, discountInfo };
    };

    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        const originalPrice = product.price;
        const { finalPrice, discountInfo } = await getBestDiscount(product);
        return {
          ...product,
          originalPrice,
          finalPrice,
          discountInfo,
        };
      })
    );

    res.render("user/productListPartial", {
      products: updatedProducts,
      totalPages,
      currentPage: safePage,
      limit,
    });
  } catch (error) {
    console.error("Error fetching products while using filter:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.PRODUCT.FETCH_ERROR);
  }
};





module.exports= {
    loadProductDetails,
    getUserProductList,
    getFilteredProductList
}