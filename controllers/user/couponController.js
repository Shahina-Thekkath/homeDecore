const Coupon = require("../../models/couponSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchma");

// const getCoupons = async (req, res) => {
//   try {
//     const coupons = await Coupon.find().sort({ createdAt: -1 });
//     const currentDate = new Date();

//     const processedCoupons = coupons.map(coupon => {
//       const expiryDate = new Date(coupon.expiresOn);
//       const isExpired = expiryDate < currentDate;
//       const isExpiringSoon = expiryDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // next 3 days

//       const usedCount = coupon.usedCount || 0;
//       const usageLimit = coupon.usageLimit || 1; // prevent divide by zero
//       const usagePercentage = Math.min((usedCount / usageLimit) * 100, 100).toFixed(2); // rounded to 2 decimals

//       const discountText =
//         coupon.discountType === "percentage"
//           ? `${coupon.discountAmount}% OFF`
//           : `₹${coupon.discountAmount} OFF`;

//       return {
//         ...coupon.toObject(),
//         isExpired,
//         isExpiringSoon,
//         usagePercentage,
//         discountText,
//       };
//     });

//     res.render("coupons", { coupons: processedCoupons });
//   } catch (error) {
//     console.error("Error fetching coupons:", error);
//     res.status(500).send("Something went wrong while fetching coupons.");
//   }
// };

const applyCoupon = async (req, res) => {
  try {
        const userId = req.session.user._id || req.session.passport._id;
        const { couponCode } = req.body;

        if (!couponCode) {
            return res.status(400).json({ success: false, message: "Coupon code is required." });
        }

        const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ success: false, message: "This coupon is no longer active." });
        }

        if (new Date(coupon.expiresOn) < new Date()) {
            return res.status(400).json({ success: false, message: "This coupon has expired." });
        }

        if (coupon.usageLimit <= coupon.usedCount) {
            return res.status(400).json({ success: false, message: "Coupon usage limit reached." });
        }

        if (coupon.usersUsed.includes(userId)) {
            return res.status(400).json({ success: false, message: "You have already used this coupon." });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Your cart is empty." });
        }

        const subtotal = cart.items.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);

        if (subtotal < coupon.minPurchaseAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required to use this coupon.`
            });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = Math.min((subtotal * coupon.discountAmount) / 100, subtotal); // cap to subtotal
        } else if (coupon.discountType === 'flat') {
            discountAmount = Math.min(coupon.discountAmount, subtotal); // no negative totals
        }

        const grandTotal = subtotal - discountAmount;

        req.session.coupon = {
          id: coupon._id,
          code: coupon.code,
          discount: discountAmount,
          subtotal,
          grandTotal,
          discountType: coupon.discountType
        };

        return res.status(200).json({
            success: true,
            message: "Coupon applied successfully.",
            data: {
                couponCode: coupon.code,
                discountAmount,
                subtotal,
                grandTotal,
                appliedDiscount: coupon.name
            }
        });

    } catch (err) {
        console.error("Error applying coupon:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user._id || req.session.passport._id;

    
    req.session.coupon = null;

    // Fetch cart and recalculate totals
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty." });
    }

    const subtotal = cart.items.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);
    const grandTotal = subtotal; // No discount after removal

    return res.status(200).json({
      success: true,
      message: "Coupon removed successfully.",
      data: {
        subtotal,
        discountAmount: 0,
        grandTotal: subtotal,
        couponCode: null,
        appliedDiscount: null
      }
    });

  } catch (err) {
    console.error("Error removing coupon:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};


module.exports = { applyCoupon,
                    removeCoupon
 };
