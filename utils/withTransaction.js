import mongoose from "mongoose";

export const withTransaction = async (callback) => {
  const isReplicaSet =
    mongoose.connection?.client?.topology?.description?.type === "ReplicaSetWithPrimary";

  if (isReplicaSet) {
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
  }

  //  Local MongoDB → NO SESSION AT ALL
  return await callback(null);
};
