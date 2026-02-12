import { getIO } from "../config/socket.js";

export const emitCategoryAdded = (category) => {
    const io = getIO();

    io.to("admin").emit("category:added", {
        categoryId: category._id,
    });

    io.to("public").emit("category:added", {
        categoryId: category._id
    });
};

export const emitCategoryUpdated = (category) => {
    const io = getIO();

    io.to("admin").emit("category:updated", {
        categoryId: category._id
    });

    io.to("public").emit("category:updated", {
        categoryId: category._id
    });
};

export const emitCategoryStatusChanged = (category) => {
    const io = getIO();

    io.to("admin").emit("category:statusChanges", {
        categoryId: category._id,
        isBlocked: category.isBlocked
    });

    io.to("public").emit("category:statusChanges", {
        categoryId: category._id,
        isBlocked: category.isBlocked
    });
};

