import { ImageKit, toFile } from "@imagekit/nodejs";
import { env, hasImageKitConfig } from "../config/env.js";
import { HttpError } from "../utils/errors.js";

const imageKit = hasImageKitConfig()
  ? new ImageKit({ privateKey: env.IMAGEKIT_PRIVATE_KEY! })
  : null;

export async function uploadPropertyImage(file: Express.Multer.File): Promise<{ url: string; fileId: string }> {
  if (!imageKit) throw new HttpError(503, "Image uploads require ImageKit credentials in backend/.env.");
  const bytes = file.buffer;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  const matchesMime = (file.mimetype === "image/jpeg" && isJpeg) || (file.mimetype === "image/png" && isPng) || (file.mimetype === "image/webp" && isWebp);
  if (!matchesMime) throw new HttpError(415, "The image contents do not match a supported JPEG, PNG, or WebP format.");
  const result = await imageKit.files.upload({
    file: await toFile(file.buffer, file.originalname, { type: file.mimetype }),
    fileName: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
    folder: "/estatea/properties",
    useUniqueFileName: true,
  });
  if (!result.url || !result.fileId) throw new HttpError(502, "ImageKit did not return a usable uploaded image.");
  return { url: result.url, fileId: result.fileId };
}

export async function uploadPropertyImages(files: Express.Multer.File[]): Promise<Array<{ url: string; fileId: string }>> {
  const uploaded: Array<{ url: string; fileId: string }> = [];
  try {
    for (const file of files) uploaded.push(await uploadPropertyImage(file));
  } catch (error) {
    const cleanup = await Promise.allSettled(uploaded.map((image) => deletePropertyImage(image.fileId)));
    cleanup.forEach((result) => {
      if (result.status === "rejected") console.error("Could not clean up a partially uploaded property image:", result.reason);
    });
    throw error;
  }
  return uploaded;
}

export async function deletePropertyImage(fileId: string): Promise<void> {
  if (!imageKit) throw new HttpError(503, "Image deletion requires ImageKit credentials in backend/.env.");
  await imageKit.files.delete(fileId);
} 
