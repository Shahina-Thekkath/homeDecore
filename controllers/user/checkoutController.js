const Cart = require("../../models/cartSchema");
const session = require("express-session");
const User = require("../../models/userSchma");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema");


const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        const user = await User.findById(userId);

        const cartItems = cart.items.map((item) => ({
            _id: item._id,
            productId: item.productId,
            name: item.productId.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.quantity * item.price,
        }));

        const grandTotal = cartItems.reduce((total, item) => total + item.subtotal, 0);

        // Use the default address or fallback to the first address
        const selectedAddress =
            user.defaultAddress &&
            user.addresses.find((address) => address._id.toString() === user.defaultAddress.toString()) ||
            user.addresses[0];

        res.render("checkout", {
            cartItems,
            grandTotal,
            addresses: user.addresses,
            selectedAddress,
        });
    } catch (error) {
        console.error("Error loading checkout page", error);
    }
};


const saveSelectedAddress = async (req, res) => {
    try {
        const userId = req.session.user._id; // Get user ID from session
        const { selectedAddress } = req.body; // Extract selected address ID from request body

        if (!selectedAddress) {
            return res.status(400).json({ message: "No address selected" });
        }

        // Find the user and update the default address
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Set the selected address as the default or handle it as required
        user.defaultAddress = selectedAddress; // Assuming you have a `defaultAddress` field
        await user.save();

        res.status(200).json({ message: "Address saved successfully" });
    } catch (error) {
        console.error("Error saving selected address:", error);
        res.status(500).json({ message: "An error occurred while saving the address" });
    }
};

module.exports = {loadCheckout,
                saveSelectedAddress
};