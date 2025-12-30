const Cart = require("../models/cartSchema");

module.exports = async (req, res, next) => {
    try {
        const userId = req.session.user?._id || req.session.passport?.user;

    if(!userId) {
        return res.redirect("/login");
    }

    const cart = await Cart.findOne({userId});

    if(!cart || cart.items.length === 0) {
        return res.redirect("/")
    }

    next();
    } catch (error) {
        console.error("ensureCartNotEmpty middleware crashed:", error);
        
    }
    
}