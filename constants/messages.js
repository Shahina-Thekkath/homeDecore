const MESSAGES = {
    // ============ ORDER MESSAGES ============

    ORDER: {
        // Success
        SAVED: "Order saved successfully",
        SUCCESS_PAGE_LOADED: "Order success page loaded successfully",
        CANCELLED: "Order cancelled successfully",
        PRODUCT_STATUS_UPDATED: "Product status updated successfully",
        PRODUCT_CANCELLED_AND_REFUNDED: "Product cancelled and refunded.",
        CANCELLED_AND_REFUNDED: "Order successfully cancelled and refund processed.",

        // Errors
        LOAD_FAILED: "Failed to load orders",
        DETAILS_LOAD_FAILED: "Failed to load order details",
        SAVE_FAILED: "Failed to save order",
        SUCCESS_PAGE_FAILED: "Failed to load order success page",
        NOT_FOUND: "Order not found",
        INVALID_ORDER: "Invalid order",
        CANCEL_FAILED: "Failed to cancel order.",
        PRODUCT_NOT_FOUND: "Product not found in this order.",
        PRODUCT_ALREADY_CANCELLED: "Product already cancelled",
        PRODUCT_CANNOT_RETURN: "Product cannot be returned",
        RETURN_ALREADY_REQUESTED: "Return already requested or processed for this product",
        RETURN_REQUEST_FAILED: "Failed to request return",

        FETCH_FAILED: "Error fetching orders",
        ORDER_DETAILS_FETCH_FAILED: "Error fetching order details",
        ALREADY_CANCELLED: "Order already cancelled",
        CANNOT_CANCEL_STAGE: "Cannot cancel order at this stage",
        SERVER_ERROR_WHILE_CANCELLING: "Server error while cancelling order.",
        INVALID_PRODUCT_INDEX: "Invalid product Index",
        PRODUCT_ALREADY_RETURNED_OR_CANCELLED: "Product already returned or cancelled",
        CANNOT_CANCEL_THIS_PRODUCT: "Cannot cancel this product at this stage",
        PRODUCT_MUST_BE_IN_RETURN_REQUESTED: "Product must be in Return Requested state before Returned",
        RETURN_WITHIN_3_DAYS: "Return can be done only within 3 days"
    },

    // ============ ADDRESS MESSAGES ============
    ADDRESS: {

        // Success
        ADDED: "Address added successfully!",

        // Errors
        NOT_FOUND: "Address not found",
        CITY_REQUIRED: "City is required"
    },

    // ============ DELIVERY MESSAGES ============
    DELIVERY: {

      // Errors
      CALCULATE_FAILED: "Failed to calculate delivery charge"

    },

     // ============ USER MESSAGES ============
    USER: {
        // Errors
        NOT_FOUND: "User not found",
        NOT_LOGGED_IN: "User not logged in"
    },

    // ============ AUTH MESSAGES ============
    AUTH: {
        // Errors
        USER_BLOCKED: "User is blocked by admin",
        PASSWORD_EMPTY: "Password field cannot be empty",
        INCORRECT_PASSWORD: "Incorrect Password"
    },

    // ============ PROFILE MESSAGES ============
    PROFILE: {
        UNAUTHORIZED: "Unauthorized. Please login again.",
        UPDATE_SUCCESS: "Profile updated successfully!",
        SERVER_ERROR: "Internal Server Error. Please try again later.",
    },

    // ============ SIGNUP MESSAGES ============

    SIGNUP: {
        PASSWORD_MISMATCH: "Passwords do not match",
        EMAIL_EXISTS: "User with this email already exists",
        INVALID_OTP: "Invalid OTP, Please try again",
        EMAIL_NOT_IN_SESSION: "Email not found in session",
        OTP_RESEND_SUCCESS: "OTP Resend Successfully",
        OTP_RESEND_FAILED: "Failed to resend OTP. Please try again",
        EMAIL_NOT_FOUND: "Email address not found.",
        RESET_EMAIL_SENT: "Password reset email sent. Please check your inbox.",
        RESET_EMAIL_FAILED: "Failed to send reset email.",
        INVALID_TOKEN: "Token is invalid",
    },

    // ============ PRODUCT MESSAGES ============
    PRODUCT: {
        // Success
        ADDED_SUCCESS: "Product added successfully!",
        DELETED_SUCCESS: "Product successfully deleted",

        // Errors
        NOT_FOUND: "Product not found",
        NOT_FOUND_IN_CART: "Product not found in cart",
        FETCH_ERROR: "Error fetching products",
        FETCH_FAILED: "Failed to fetch product",
        FILTER_FAILED: "Error filtering products",
        OUT_OF_STOCK: "Product is out of stock"
    },

    // ============ CATEGORY MESSAGES ============

    CATEGORY: {
         // Errors
         ALREADY_EXISTS: "Category already exist",
        NO_CHANGES: "Changes not made",
        UPDATE_ERROR: "An error occurred while updating the category.",
    },

    // ============ CART MESSAGES ============
    CART: {
        // Success
        PRODUCT_ADDED: "Product added to cart",
        ITEM_DELETED: "Item deleted successfully",
        
        // Errors
        NOT_FOUND: "Cart not found",
        QUANTITY_EXCEEDS_STOCK: "Requested quantity exceeds stock",
        MAX_QUANTITY_EXCEEDED: "You can't add more than 5 items per product"
    },

    // ============ WISHLIST MESSAGES ============

    WISHLIST: {
        PRODUCT_ADDED: "Product added to wishlist",
        PRODUCT_ALREADY_EXISTS: "Product already in wishlist",
        CLEARED_SUCCESS: "Wishlist cleared successfully",
        PRODUCT_REMOVED: "Product removed from wishlist",
    },

    // ============ VALIDATION MESSAGES ============
    VALIDATION: {
        // Errors
        INVALID_REQUEST: "Invalid request",
        ALL_FIELDS_REQUIRED: "All fields are required",

    },

    // ============ WALLET MESSAGES ============
    WALLET: {
        // Success
        PAYMENT_SUCCESS: "Wallet payment successful",

        // Errors
        NOT_FOUND: "Wallet not found",
        INSUFFICIENT_BALANCE: "Insufficient wallet balance",
        PAYMENT_FAILED: "Failed to process wallet payment"
    },

    PAYMENT: {
        // Success
        VERIFIED: "Payment verified successfully",

        // Errors
        INVALID_AMOUNT: "Invalid payment amount",
        AMOUNT_EXCEEDS_LIMIT: "Amount exceeds Razorpay's maximum transaction limit (₹5,00,000)",
        VERIFICATION_FAILED: "Payment verification failed",
        FAILED_ORDER_SAVE: "Failed to save failed order"
    },

    // ============ CHECKOUT MESSAGES ============
    CHECKOUT: {
        // Success
        ADDRESS_SAVED: "Address saved successfully",

        // Errors
        NO_ADDRESS_SELECTED: "No address selected",
        ADDRESS_SAVE_FAILED: "An error occurred while saving the address"
    },

    // ============ COUPON MESSAGES ============
    COUPON: {

        // Success
        ADDED_SUCCESS: "Coupon added successfully",
        APPLIED: "Coupon applied successfully.",
        REMOVED: "Coupon removed successfully.",
        UPDATED_SUCCESS: "Coupon updated successfully",

        // Errors
        CODE_REQUIRED: "Coupon code is required.",
        NOT_FOUND: "Coupon not found.",
        INACTIVE: "This coupon is no longer active.",
        EXPIRED: "This coupon has expired.",
        USAGE_LIMIT_REACHED: "Coupon usage limit reached.",
        ALREADY_USED: "You have already used this coupon.",
        EMPTY_CART: "Your cart is empty.",
        CART_EMPTY: "Cart is empty.",
        CODE_EXISTS: "Coupon code already exists"

    },
    
    // ============ WALLET MESSAGES ============
    WALLET: {
        // Errors
        SERVER_ERROR_WHILE_LOADING: "Server error while loading wallet"
    },

    // ============ SALES MESSAGES ============

    SALES: {
        // Dashboard
        FETCH_FAILED: "Failed to fetch sales data",

        NO_DATA_FOUND: "No sales data found",
        PDF_GENERATION_FAILED: "Failed to generate sales report PDF",
        EXCEL_GENERATION_FAILED: "Error generating Excel file"
    },

    // ============ SALES MESSAGES ============
    OFFER: {
       NOT_FOUND: "Offer not found",
       PRODUCT_OFFER_NOT_FOUND: "Product offer not found.",
       INVALID_TYPE: "Invalid offer type.",
       UPDATED_SUCCESS: "Offer updated successfully.",
    },
    

    // ============ GENERIC MESSAGES ============
    GENERIC: {
        // Errors
        INTERNAL_ERROR: "Internal server error",
        SERVER_ERROR: "Server error!",
        SOMETHING_WRONG: "Something went wrong",
        ERROR_OCCURRED: "An error occurred",
        PAGE_ERROR: "pageerror",
        PAGE_NOT_FOUND: "Page not found",

    }
};

export default MESSAGES;