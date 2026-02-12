import {getIO} from "../config/socket.js";

export const emitCouponChange = ({
    action,
    couponId = null,
}) => {
    const io = getIO();

    io.to("checkout_users").emit("coupon:changed", {
        action, 
        couponId
    });
};