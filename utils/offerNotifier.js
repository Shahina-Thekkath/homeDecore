import { getIO } from "../config/socket.js";

export const emitOfferChange = ({
    action,
    offerType,
    productId = null,
    categoryId = null,
}) => {
    const io = getIO();

    io.to("public").emit("offer:changed", {
        action,
        offerType,
        productId,
        categoryId,
    })
};