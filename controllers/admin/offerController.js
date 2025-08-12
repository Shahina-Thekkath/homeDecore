const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const ProductOffer = require('../../models/productOfferSchema');
const CategoryOffer = require('../../models/categoryOfferSchema');
const mongoose = require('mongoose');

const getAddOffer = async (req, res) => {
    try {
        const products = await Product.find({}, 'name');         // {} -> all fields are selected and then   'name' -> filters to select only the name field
        const categories = await Category.find({}, 'name');                                //[
                                                                                          // { name: "iPhone 15" },
                                                                                          // { name: "Samsung Galaxy S23" },
                                                                                          //...
                                                                                          //]


        res.render('addOffer', {
            products,
            categories,
            errors: {}
        });
    } catch (error) {
        console.log(("Error loading add offer page:", error));
        res.status(500).json({ success: false, message: "Internal Server Error" });
        
    }
};

const postAddOffer = async (req, res) => {
    try {
        const {offerType, productId, categoryId, discountType, discountAmount, startDate, endDate} = req.body;

        console.log("postOffer", offerType, productId, categoryId, discountType, discountAmount, startDate, endDate);
        console.log(typeof categoryId);
    
        

        let errors = {};
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if(!offerType || !['product', 'category'].includes(offerType)) {
            errors.offerType = 'Invalid offer type';
        }

       if (offerType === 'category' && (!categoryId || categoryId === 'undefined' || categoryId === 'null' || 
                    categoryId.trim() === '')) {
            errors.categoryId = 'Please select a category';
            }

            if (offerType === 'product' &&
        (!productId || productId === 'undefined' || productId === 'null' || productId.trim() === '')) {
                errors.productId = 'Please select a product';
                }


        if(!discountType || !['percentage', 'flat'].includes(discountType)) {
            errors.discountType = 'Invalid discount type';
        }

         if (!discountAmount || isNaN(discountAmount) || Number(discountAmount) <= 0) {
            errors.discountAmount = "Discount must be a positive number";
        }


        if(!startDate || !dateRegex.test(startDate)) {
            errors.startDate = 'Start date is invalid';
        }

        if(!dateRegex.test(startDate) && dateRegex.test(endDate) && new Date(endDate) <= new Date(startDate)) {
            errors.endDate = 'End date must be after start date';
        }

        if(Object.keys(errors).length > 0) {
            return res.status(200).json({ success: false, errors });
        }

        console.log("finish validation");
        

        if (offerType === 'product') {
            await ProductOffer.create({
                productId,
                discountAmount,
                startDate,
                endDate,
                discountType
            });
        } else {
            await CategoryOffer.create({
                categoryId,
                discountType,
                discountAmount,
                startDate,
                endDate
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error creating offer:', error);
        res.status(500).json({ success: false, message: "Server Error" });
        
    }
};

const getOfferList = async (req, res) => {
     try {

        //Fetch both product & category offers
        const productOffers = await ProductOffer.find()
        .populate('productId', 'name price')
        .lean();

        const categoryOffers = await CategoryOffer.find()
        .populate('categoryId', 'name')
        .lean();

        //Merge both into list with an 'offerType" flag
        const offers = [
            ...productOffers.map(offer => ({
              ...offer,
              offerType: 'Product',
              name: offer.productId ? offer.productId.name : 'Deleted Product'
            })),
            ...categoryOffers.map(offer =>({
                ...offer,
                offerType: 'Category',
                name: offer.categoryId ? offer.categoryId.name : 'Deleted Category'
            }))
        ];

        //sort by start date 
        offers.sort((a,b) => new Date(b.startDate) - new Date(a.startDate));

        res.render('offerList', {offers: offers || []});


    } catch (error) {
        console.error(('Error fetching offer list:', error));
        res.status(500).send('Internal Server Error');
        
     }
};


const toggleOfferStatus = async (req, res) => {
  try {
    const offerId = req.params.id;

    // Try to find in ProductOffer
    let offer = await ProductOffer.findById(offerId);

    let offerType = 'product';
    if (!offer) {
      // If not found in ProductOffer, try CategoryOffer
      offer = await CategoryOffer.findById(offerId);
      offerType = 'category';
    }

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Toggle the isActive flag
    offer.isActive = !offer.isActive;
    await offer.save();

    res.status(200).json({ message: `${offerType === 'product' ? 'Product' : 'Category'} offer ${offer.isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getEditOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    let offer, offerType;

    offer = await ProductOffer.findById(offerId).lean();
    if (offer) {
      offer.offerType = 'product';
    } else {
      offer = await CategoryOffer.findById(offerId).lean();
      if (offer) {
        offer.offerType = 'category';
      }
    }

    if (!offer) return res.status(404).send('Offer not found');

    const products = await Product.find().lean();
    const categories = await Category.find().lean();

    res.render('editOffer', { offer, products, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

const updateOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
         const {offerType, productId, categoryId, discountType, discountAmount, startDate, endDate} = req.body;

        console.log("putOffer", offerType, productId, categoryId, discountType, discountAmount, startDate, endDate);
        

        let errors = {};
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if(!offerType || !['product', 'category'].includes(offerType)) {
            errors.offerType = 'Invalid offer type';
        }

        if(offerType === 'category' && !categoryId) {
            errors.categoryId = 'Please select a category';
        }

        if (offerType === "product" && !productId) {
      errors.productId = "Please select a product";
    }

        if(!discountType || !['percentage', 'flat'].includes(discountType)) {
            errors.discountType = 'Invalid discount type';
        }

         if (!discountAmount || isNaN(discountAmount) || Number(discountAmount) <= 0) {
            errors.discountAmount = "Discount must be a positive number";
        }


        if(!startDate || !dateRegex.test(startDate)) {
            errors.startDate = 'Start date is invalid';
        }

        if(dateRegex.test(startDate) && dateRegex.test(endDate) && new Date(endDate) <= new Date(startDate)) {

            errors.endDate = 'End date must be after start date';
        }

        if(Object.keys(errors).length > 0) {
            return res.status(200).json({ success: false, errors });
        }
        console.log("validation in update completed");
        

        let updated = null;
        if(offerType === "product") {
            if(!productId) {
                return res.status(400).json({ success: false, message: "Product ID is is required for product Offer." });
            }

              updated = await ProductOffer.findByIdAndUpdate(
                offerId,
                {
                    productId,
                    discountType,
                    discountAmount,
                    startDate,
                    endDate
                },
                {new : true}
            );

            if(!updated) {
                return res.status(404).json({ success: false, message: "Product offer not found." });
            }
        } else if (offerType === "category") {
            if(!categoryId) {
                return res.status(400).json({ success: false, message: "Category Id required for category offer." });
            }

             updated = await CategoryOffer.findByIdAndUpdate(
                offerId,
                {
                    categoryId,
                    discountType,
                    discountAmount,
                    startDate,
                    endDate
                },
                {new: true}
            );
            

            if(!updated) {
                return res.status(400).json({ success: false, message: "Invalid offer type." });
            }
        } else {
            return res.status(400).json({ success: false, message: "Invalid offer type."});
        }

        res.status(200).json({ success: true, message: "Offer updated successfully." });

    } catch (error) {
        console.error("Error editing offer:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



module.exports = {
    getAddOffer,
    postAddOffer,
    getOfferList,
    toggleOfferStatus,
    getEditOffer,
    updateOffer  
}