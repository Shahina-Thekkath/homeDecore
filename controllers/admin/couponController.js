const Coupon = require("../../models/couponSchema");
const moment = require("moment");
const { STATUS_CODES, MESSAGES } = require("../../constants");

const renderAddCouponPage = async (req, res) => {
  try {
    res.render("addCoupon");
  } catch (error) {
    console.error("Add Coupon render error:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.SERVER_ERROR);
  }
};

const addCoupon = async (req, res) => {
  try {
    const {
      name,
      code,
      discountAmount,
      usageLimit,
      minPurchaseAmount,
      expiresOn,
      discountType,
    } = req.body;

    const errors = {};

    // Required field checks
    if (!name) errors.name = "Coupon name is required";
    if (!code) errors.code = "Coupon code is required";
    if (!discountAmount) errors.discountAmount = "Discount amount is required";
    if (!usageLimit) errors.usageLimit = "Usage limit amount is required";
    if (!minPurchaseAmount)
      errors.minPurchaseAmount = "Minimum purchase amount is required";
    if (!expiresOn) errors.expiresOn = "Expiry date is required";
    if (!discountType) errors.discountType = "Discount type is required";

    // pattern validation
    if (name && !/^[a-zA-Z0-9₹\s]{3,30}$/.test(name)) {
      errors.name = "Name should be 3-30 letters only";
    }

    if (code && !/^[A-Z0-9_-]{3,10}$/.test(code)) {
      errors.code =
        "Code should be 3-10 character, uppercase letters/numbers only";
    }

    if (discountAmount && !/^\d+(\.\d{1,2})?$/.test(discountAmount)) {
      errors.discountAmount = "Enter a valid amount (e.g., 10 or 10.50)";
    }

    if (usageLimit && !/^\d+$/.test(usageLimit)) {
      errors.usageLimit = "Usage limit must be a valid number";
    }

    if (minPurchaseAmount && !/^\d+(\.\d{1,2})?$/.test(minPurchaseAmount)) {
      errors.minPurchaseAmount = "Enter a valid amount (e.g., 50 or 50.00)";
    }

    let newDate;
    if (expiresOn) {
      const [day, month, year] = expiresOn.split('-');
      const isoDate = new Date(`${year}-${month}-${day}`); // Convert to valid Date object
      if (isNaN(Date.parse(isoDate))) {
        errors.expiresOn = "Invalid date format";
      }else {
      newDate = isoDate;
      }
    }


    if (discountType && !["percentage", "flat"].includes(discountType)) {
      errors.discountType =
        'Discount type must be either "percentage" or "flat"';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, errors });
    }

    const existingCoupon = await Coupon.findOne({ code});
    if (existingCoupon) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        errors: { code: MESSAGES.COUPON.CODE_EXISTS},
      });
    }

    await Coupon.create({
      name,
      code,
      discountAmount,
      usageLimit,
      minPurchaseAmount,
      expiresOn: newDate,
      discountType,
    });

    return res.json({ success: true, message: MESSAGES.COUPON.ADDED_SUCCESS });
  } catch (error) {
    console.error("Internal Server Error adding coupon)", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.SERVER_ERROR });
  }
};


const getCouponList = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render('couponList', { coupons });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.SERVER_ERROR);
    }
};

const toggleCouponStatus = async (req, res) => {
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);

        if(!coupon) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.COUPON.NOT_FOUND });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        return res.json({ success: true, message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error(err);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message:MESSAGES.GENERIC.SERVER_ERROR });
        
    }
};

const getEditCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    res.render('editCoupon', {moment, coupon});
  } catch (error) {
    console.error("EditCoupon render error", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.GENERIC.SERVER_ERROR)
    
  }
};

const updateCoupon = async (req, res) => {
  try {
     const id = req.params.id;

    const {
      name,
      code,
      discountAmount,
      usageLimit,
      minPurchaseAmount,
      expiresOn,
      discountType,
    } = req.body;

    
    

    const errors = {};

    // Required field checks
    if (!name) errors.name = "Coupon name is required";
    if (!code) errors.code = "Coupon code is required";
    if (!discountAmount) errors.discountAmount = "Discount amount is required";
    if (!usageLimit) errors.usageLimit = "Usage limit amount is required";
    if (!minPurchaseAmount)
      errors.minPurchaseAmount = "Minimum purchase amount is required";
    if (!expiresOn) errors.expiresOn = "Expiry date is required";
    if (!discountType) errors.discountType = "Discount type is required";

    // pattern validation
    if (name && !/^[a-zA-Z0-9₹\s]{3,30}$/.test(name)) {
      errors.name = "Name should be 3-30 letters only";
    }

    if (code && !/^[A-Z0-9_-]{3,10}$/.test(code)) {
      errors.code =
        "Code should be 3-10 character, uppercase letters/numbers only";
    }

    if (discountAmount && !/^\d+(\.\d{1,2})?$/.test(discountAmount)) {
      errors.discountAmount = "Enter a valid amount (e.g., 10 or 10.50)";
    }

    if (usageLimit && !/^\d+$/.test(usageLimit)) {
      errors.usageLimit = "Usage limit must be a valid number";
    }

    if (minPurchaseAmount && !/^\d+(\.\d{1,2})?$/.test(minPurchaseAmount)) {
      errors.minPurchaseAmount = "Enter a valid amount (e.g., 50 or 50.00)";
    }

    let newDate;
    if (expiresOn) {
      const [day, month, year] = expiresOn.split('-');
      const isoDate = new Date(`${year}-${month}-${day}`); // Convert to valid Date object
      if (isNaN(Date.parse(isoDate))) {
        errors.expiresOn = "Invalid date format";
      }else {
      newDate = isoDate;
      }
    }


    if (discountType && !["percentage", "flat"].includes(discountType)) {
      errors.discountType =
        'Discount type must be either "percentage" or "flat"';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, errors });
    }

    const existingCoupon = await Coupon.findOne({ code, _id: {$ne: id} });
    if (existingCoupon) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        errors: { code: MESSAGES.COUPON.CODE_EXISTS },
      });
    }

    await Coupon.findByIdAndUpdate( id, {
      name,
      code,
      discountAmount,
      usageLimit,
      minPurchaseAmount,
      expiresOn: newDate,
      discountType,
    }, { new: true });

    return res.json({ success: true, message: MESSAGES.COUPON.UPDATED_SUCCESS });
  } catch (error) {
    console.error("Internal Server Error editing coupon", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.GENERIC.SERVER_ERROR });
  }
};

module.exports = {
    renderAddCouponPage,
    addCoupon,
    getCouponList,
    toggleCouponStatus,
    getEditCoupon,
    updateCoupon
};
