import {getIO} from "../config/socket.js";

export const emitUserBlocked = (userId) => {
    const io = getIO();

    io.to(`user_${userId}`).emit("user:blocked", {
        message: "Your account has been blocked by admin"
    });
};

export const emitUserUnblocked = (userId) => {
    const io = getIO();

    io.to(`user_${userId}`).emit("user:unblocked", {
        message: "your account is now unblocked"
    })
};