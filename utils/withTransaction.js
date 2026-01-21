import mongoose from "mongoose";
import logger from "../utils/logger.js"

export const withTransaction = async (callback) => {
  const isReplicaSet =
    mongoose.connection?.client?.topology?.description?.type === "ReplicaSetWithPrimary";

  if (isReplicaSet) {
    logger.info("✅ MongoDB TRANSACTIONS ENABLED (Replica Set detected)");
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
  } else {
  logger.info("⚠️ MongoDB running WITHOUT transactions");
}

  //  Local MongoDB → NO SESSION AT ALL
  return await callback(null);
};
