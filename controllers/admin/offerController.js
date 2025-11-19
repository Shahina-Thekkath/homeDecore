const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const ProductOffer = require('../../models/productOfferSchema');
const CategoryOffer = require('../../models/categoryOfferSchema');
const mongoose = require('mongoose');
const { STATUS_CODES, MESSAGES } = require("../../constants");

const getAddOffer = async (req, res) => {
    try {
        const products = await Product.find({}, 'name price');         // {} -> all fields are selected and then   'name' -> filters to select only the name field
        const categories = await Category.find({ isBlocked: false }, 'name');                                //[
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
        console.error(("Error loading add offer page:", error));
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.INTERNAL_ERROR });
        
    }
};

const postAddOffer = async (req, res) => {
    try {
        const {offerType, productId, categoryId, discountType, discountAmount, startDate, endDate} = req.body;
        
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
            return res.status(STATUS_CODES.OK).json({ success: false, errors });
        }
        
        let newOffer;
        if (offerType === 'product') {
            newOffer = await ProductOffer.create({
                productId,
                discountAmount,
                startDate,
                endDate,
                discountType
            });

            // link it to Product
            await Product.findByIdAndUpdate(productId, { productOffer: newOffer._id });
        } else {
            newOffer = await CategoryOffer.create({
                categoryId,
                discountType,
                discountAmount,
                startDate,
                endDate
            });

            // link it to category
            await Category.findByIdAndUpdate(categoryId, { categoryOffer: newOffer._id });
        }

        return res.status(STATUS_CODES.OK).json({ success: true });
    } catch (error) {
        console.error('Error creating offer:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.SERVER_ERROR });
        
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
        // offers.sort((a,b) => new Date(b.startDate) - new Date(a.startDate));

        offers.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        

        res.render('offerList', {offers: offers || []});


    } catch (error) {
        console.error(('Error fetching offer list:', error));
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.INTERNAL_ERROR);
        
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
      return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.OFFER.NOT_FOUND });
    }

    // Toggle the isActive flag
    offer.isActive = !offer.isActive;
    await offer.save();

    if(!offer.isActive) {
        if (offerType === "product") {
            await Product.findByIdAndUpdate(offer.productId, { $unset: {productOffer: 1 } })
        } else {
            await Category.findByIdAndUpdate(offer.categoryId, { $unset: { categoryOffer: 1 } });
        }
    }

    res.status(STATUS_CODES.OK).json({ message: `${offerType === 'product' ? 'Product' : 'Category'} offer ${offer.isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.GENERIC.INTERNAL_ERROR });
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

    if (!offer) return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.OFFER.NOT_FOUND);

    const products = await Product.find().lean();
    const categories = await Category.find().lean();

    res.render('editOffer', { offer, products, categories });
  } catch (err) {
    console.error(err);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.SERVER_ERROR);
  }
};

const updateOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
         const {offerType, productId, categoryId, discountType, discountAmount, startDate, endDate} = req.body;
        

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
            return res.status(STATUS_CODES.OK).json({ success: false, errors });
        }

        let updated = null;
        if(offerType === "product") {
            const oldOffer = await ProductOffer.findById(offerId);

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
                return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.OFFER.PRODUCT_OFFER_NOT_FOUND });
            }

            // unlink from old product if product changes
            if (oldOffer && oldOffer.productId.toString() !== productId) {
                await Product.findByIdAndUpdate(oldOffer.productId, { $unset: {productOffer: 1} });
            }

            // link to new product
            await Product.findByIdAndUpdate(productId, { productOffer: updated._id });

        } else if (offerType === "category") {
          
                const oldOffer = await CategoryOffer.findById(offerId);

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
                return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.OFFER.INVALID_TYPE });
            }

            // unlink from old category if changed
            if(oldOffer && oldOffer.categoryId.toString() !== categoryId) {
                await Category.findByIdAndUpdate(oldOffer.categoryId, { $unset: { categoryOffer: 1 } });
            }

            // link to new category
            await Category.findByIdAndUpdate(categoryId,  { categoryOffer: updated._id });
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.OFFER.INVALID_TYPE});
        }

        res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.OFFER.UPDATED_SUCCESS });

    } catch (error) {
        console.error("Error editing offer:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.INTERNAL_ERROR });
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