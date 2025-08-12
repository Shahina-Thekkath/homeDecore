
const Product = require("../../models/productSchema");
const CategoryOffer = require('../../models/categoryOfferSchema');
const ProductOffer = require('../../models/productOfferSchema');


const loadHomepage = async(req, res) =>{
    try{
         const user = req.session.user || req.session.passport;
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

                if(productOffer) {
                    let tempPrice
                    const { discountType, discountAmount } = productOffer;
                    if(discountType === 'percentage') {
                        tempPrice = originalPrice - (originalPrice * discountAmount) / 100;
                    } else if (discountType === 'flat') {
                        tempPrice = originalPrice - discountAmount;
                    }
                    if (tempPrice < bestPrice) {
                        bestPrice = tempPrice;
                    }
                    discountInfo = {
                        type: discountType,
                        amount: discountAmount,
                        source: "product"
                    };
    
                } else {
                    // get valid category offer if no Product offer
                    const categoryOffer = await CategoryOffer.findOne({
                        categoryId: product.categoryId._id,
                        isActive: true,
                        startDate: { $lte: currentDate },
                        endDate: { $gte: currentDate }
                    });

                    if(categoryOffer) {
                        let tempPrice
                        const { discountType, discountAmount } = categoryOffer;
                        if( discountType === "percentage" ) {
                            tempPrice = originalPrice - (originalPrice * discountAmount) / 100;
                        } else if (discountType === 'flat') {
                            tempPrice = originalPrice - discountAmount;
                        }
                        if (tempPrice < bestPrice) {
                            bestPrice = tempPrice;
                        }
                        discountInfo = {
                            type: discountType,
                            amount: discountAmount,
                            source: "category"
                        };
                    }
                }

                // prevent negative price
                finalPrice = Math.max(bestPrice, 0);

                return {
                    ...product,
                    originalPrice,
                    finalPrice: finalPrice.toFixed(2),
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
    
