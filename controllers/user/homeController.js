
const Product = require("../../models/productSchema");
const CategoryOffer = require('../../models/categoryOfferSchema');
const ProductOffer = require('../../models/productOfferSchema');


const loadHomepage = async(req, res) =>{
    try{
         const user = req.session.user || req.session.passport;
         console.log("home",user);
         
         let products = await Product.find({isBlocked:false}).populate("categoryId").limit(20).lean();

         const currentDate = new Date();

         //Process each product for offer calculations
         const updatedProducts = await Promise.all(
            products.map(async (product) => {
                const originalPrice = product.price;
                let finalPrice = originalPrice;
                let discountInfo = null;

          
                let bestPrice = originalPrice;

                //Get valid product offer
                const productOffer = await ProductOffer.findOne({
                    productId: product._id,
                    isActive: true,
                    startDate: { $lte: currentDate },
                    endDate: { $gte: currentDate }
                });

                
                    // get valid category offer if no Product offer
                    const categoryOffer = await CategoryOffer.findOne({
                        categoryId: product.categoryId._id,
                        isActive: true,
                        startDate: { $lte: currentDate },
                        endDate: { $gte: currentDate }
                    });

                    let productDiscountPrice = originalPrice;
                    let categoryDiscountPrice = originalPrice;

                    // ----Calculate product offer discount

                    if(productOffer) {
                        if(productOffer.discountType === "percentage") {
                            productDiscountPrice = originalPrice - (originalPrice * productOffer.discountAmount) / 100;
                        } else if(productOffer.discountType === 'flat') {
                            productDiscountPrice = originalPrice - productOffer.discountAmount;
                        }
                    }

                    //---Calculate category offer

                    if(categoryOffer) {
                        if(categoryOffer.discountType === 'percentage') {
                            categoryDiscountPrice = originalPrice - (originalPrice * categoryOffer.discountAmount) / 100;
                        } else if (categoryOffer.discountType === 'flat') {
                            categoryDiscountPrice = originalPrice - categoryOffer.discountAmount;
                        }
                    }

                    // choose the better discount 

                    if (productDiscountPrice !== undefined && 
                        productDiscountPrice < categoryDiscountPrice && 
                        productDiscountPrice < bestPrice) {
                            bestPrice = productDiscountPrice;
                            discountInfo = {
                                type: productOffer?.discountType || null,
                                amount: productOffer?.discountAmount || 0,
                                source: "product"
                            };
                        } else if (categoryDiscountPrice !== undefined &&
                            categoryDiscountPrice < bestPrice
                        ) {
                            bestPrice = categoryDiscountPrice;
                            discountInfo = {
                                type: categoryOffer?.discountType || null,
                                amount: categoryOffer?.discountAmount || 0,
                                source: "category"
                            };
                        }

                // prevent negative price
                bestPrice = Math.max(bestPrice, 0);

                return {
                    ...product,
                    originalPrice,
                    finalPrice: bestPrice.toFixed(2),
                    discountInfo
                };
            })
         );

         if(user){
            return res.render('home', {user,products:updatedProducts})
         }else{
            return res.render('home',{products:updatedProducts});  
         }
        
    }catch(error){
        console.error("home page not found", error);
        res.status(500).send("server error")
    }
};


module.exports = {
    loadHomepage
    
}
    
