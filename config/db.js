import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGODB_URI);

        logger.info("DB Connected");
        
        mongoose.connection.once("open", () => {
      logger.info(
        "MongoDB Topology:",
        mongoose.connection.client.topology.description.type
      );
    });

    }
    catch(error){
        logger.error("error connecting DB ", error.message);
        process.exit(1);
    }
    
};

export default connectDB;