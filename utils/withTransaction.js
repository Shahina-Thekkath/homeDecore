import mongoose from "mongoose";
import logger from "../utils/logger.js"

export const withTransaction = async (callback) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await callback(session);
    });

    return result;
  } finally {
    session.endSession();
  }
};

