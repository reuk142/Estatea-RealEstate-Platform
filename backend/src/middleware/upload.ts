import multer from "multer";
import { HttpError } from "../utils/errors.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const propertyImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4, fields: 20, fieldSize: 16 * 1024, parts: 24 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) return callback(new HttpError(415, "Only JPEG, PNG, and WebP images are accepted."));
    callback(null, true);
  },
}).array("images", 4); 
