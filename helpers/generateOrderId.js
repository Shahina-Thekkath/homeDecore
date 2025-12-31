module.exports = function generateOrderIdFromFormDate(createdAt) {
    const prefix = "ORD";
    const time = createdAt.getTime().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${time}-${random}`;
}