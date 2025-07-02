const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");


const loadProductDetails = async (req, res) =>{
    try {
        const productId = req.params.id;
        console.log("loadProduct1", productId);
        

        const user = req.session.user || req.session.passport;
         let cart 
         let grandTotal;
         console.log("loadProduct2", user);

        if(user){
             cart = await Cart.findOne({userId: user._id}).populate({path:"items.productId"});
            
             const cartItems = cart && cart.items && cart.items.length > 0
                ? cart.items.map((item) => ({
                    _id: item._id,
                    productId: item.productId._id,
                    name: item.productId.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.price * item.quantity
                }))
                : [];
    
            grandTotal = cartItems.reduce((total, item) => total + item.subtotal, 0);

           
    
           
        }else{

            cart = null;
        }

        

      
       
        
        const currentProduct = await Product.findById(productId);
       

        const relatedProduct = await Product.find({
            _id:{$ne:productId},
            categoryId:currentProduct.categoryId
        }).limit(5);
        
        
        res.render('productDetails',{currentProduct, relatedProduct, cart, grandTotal});
    } catch (error) {
       console.error("Error while rendering the product details page: ", error);
       
        res.redirect("/PageNotFound");
    }
}

module.exports= {
    loadProductDetails
}