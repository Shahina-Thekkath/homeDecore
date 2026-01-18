import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// configure multer storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products", // cloudinary folder name,
    allowed_formats: ["jpeg", "jpg", "png", "gif"],
    transformation: [
      {
        quality: "auto",
        fetch_format: "auto",
      },
      {
        width: 1200,
        height: 1200,
      },
    ],
  },
});

const uploads = multer({ storage });

export { cloudinary, uploads };
