const Product = require('../models/productSchema');

module.exports = async (req, res, next) => {
    try {
        const name = req.body.productName;

        if(!name) {
            return res.status(400).json({message: "Name required"});
        }

        const exists = await Product.findOne({name});

        if(exists) {
            return res.status(409).json({success: false, message: 'Product already exists'});
        }

        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: "Server error in duplicate check"})
        
    }
}