const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchma");
const Category = require('../../models/categorySchema');


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
        }).limit(8);
      
        
        
        res.render('productDetails',{currentProduct, relatedProduct, cart, grandTotal, user});
    } catch (error) {
       console.error("Error while rendering the product details page: ", error);
       
        res.redirect("/PageNotFound");
    }
}

const getUserProductList = async(req, res) =>{
    try {

        const userId = req.session.user?._id;
        const user = await User.findById(userId);

        const sort = req.query.sort || 'newest';
        

        // default
        const limit = 9;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        
        const query = { isBlocked: false };

        // Fetch total count
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

    
        const products = await Product.find(query)
            .populate("categoryId", "name")
            .sort({ createdAt: -1 }) // newest by default
            .skip(skip)
            .limit(limit)
            .lean();

            //  Aggregate product count by category
        const categoryCounts = await Product.aggregate([
            { $match: { isBlocked: false } },
            { $group: {
                _id: "$categoryId",
                count: { $sum: 1 }
            }}
        ]);

        //  Populate category names
        const countsWithNames = await Category.populate(categoryCounts, {
            path: "_id",
            select: "name"
        });

        //  Convert to a simpler format
        const categories = countsWithNames.map(item => ({
            name: item._id.name,
            count: item.count
        }));

       
        res.render('userProductList', {
            products,
            user,
            sort,
            limit,
            totalPages,    
            currentPage: page,
            categories
        });
    } catch (error) {
        console.error("Error loading user product List:", error);
        res.redirect("/PageNotFound");
        
    }
}

const getFilteredProductList = async (req, res) =>{
    try {
          const {sort, category, search } = req.query;

          const limit = parseInt(req.query.limit) || 12;
          const page = parseInt(req.query.page) || 1;

         
          

          const query = {isBlocked: false};
          if(category){
            const catDoc = await Category.findOne({ name: category });
            if(catDoc){
                query.categoryId = catDoc._id;
            }
          }
          
          let sortOption = {createdAt:-1};
          switch(sort) {
            case 'name_asc' : sortOption = {name: 1}; break;
            case 'name_desc' : sortOption = {name: -1}; break;
            case 'price_asc' : sortOption = {price: 1}; break;
            case 'price_desc' : sortOption = {price: -1}; break;
          }

          const trimmedSearch = search?.trim();
          if(trimmedSearch && trimmedSearch.length > 0){
            const searchRegex =  new RegExp(trimmedSearch, 'i');

            // returns all the categories which starts with the searchRegex
            const catDocs = await Category.find({ name: searchRegex });
            const catIds = catDocs.map(cat => cat._id);

            const parsedPrice = parseFloat(trimmedSearch);
            const isValidPrice = !isNaN(parsedPrice);

            query.$or = [
                {name: searchRegex},
                ...(isValidPrice
                        ? [{
                            $expr: {
                            $regexMatch: {
                                input: { $toString: "$price" },
                                regex: `^${parsedPrice}`
                            }
                            }
                        }]
                        : []),      // The ... spreads the contents of either array (the [ { price: parsedPrice } ] or the empty []) into the $or array.
                { categoryId: { $in: catIds } }
            ];


          }

          const totalProducts = await Product.countDocuments(query);
            const totalPages = Math.ceil(totalProducts / limit);

            const safePage = (page > totalPages && totalPages !== 0) ? totalPages : (page < 1 ? 1 : page);

            const skip = (safePage - 1) * limit;

          const products = await Product.find(query).populate("categoryId", "name").sort(sortOption).skip(skip)
            .limit(limit).lean();

            


          res.render('user/productListPartial', {products, totalPages, currentPage: safePage, limit});

    } catch (error) {
         console.error("Error fetching products while using filter:", error);
         res.status(500).send('Error fetching products');
    }
};




module.exports= {
    loadProductDetails,
    getUserProductList,
    getFilteredProductList
}