const Coupon = require("../../models/couponSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchma");
const { STATUS_CODES, MESSAGES } = require("../../constants");

const applyCoupon = async (req, res) => {
  try {
        const userId = req.session.user?._id || req.session.passport?.user;
        const { couponCode } = req.body;

        if (!couponCode) {
            return res.status(STATUS_CODES.OK).json({ success: false, message: MESSAGES.COUPON.CODE_REQUIRED });
        }

        const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });

        if (!coupon) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.COUPON.NOT_FOUND });
        }

        if (!coupon.isActive) {
            return res.status(STATUS_CODES.OK).json({ success: false, message: MESSAGES.COUPON.INACTIVE });
        }

        if (new Date(coupon.expiresOn) < new Date()) {
            return res.status(STATUS_CODES.OK).json({ success: false, message: MESSAGES.COUPON.EXPIRED });
        }

        if (coupon.usageLimit <= coupon.usedCount) {
            return res.status(STATUS_CODES.OK).json({ success: false, message: MESSAGES.COUPON.USAGE_LIMIT_REACHED });
        }

        if (coupon.usersUsed.includes(userId)) {
            return res.status(STATUS_CODES.OK).json({ success: false, message: MESSAGES.COUPON.ALREADY_USED });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(STATUS_CODES.OK).json({ success: false, message: MESSAGES.COUPON.EMPTY_CART });
        }

        const subtotal = cart.items.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);

        if (subtotal < coupon.minPurchaseAmount) {
            return res.status(STATUS_CODES.OK).json({
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
        

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: MESSAGES.COUPON.APPLIED,
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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.INTERNAL_ERROR });
    }
}

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.passport._id;

    
    req.session.coupon = null;

    // Fetch cart and recalculate totals
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON.CART_EMPTY });
    }

    const subtotal = cart.items.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);
    const grandTotal = subtotal; // No discount after removal

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.COUPON.REMOVED,
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
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.INTERNAL_ERROR });
  }
};


module.exports = { applyCoupon,
                    removeCoupon
 };
