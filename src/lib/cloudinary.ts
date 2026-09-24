import crypto from "node:crypto";
import { requireEnv } from "@/lib/env";

/**
 * Cloudinary's documented signing algorithm: sort every param to be signed
 * alphabetically by key, join as "key=value&key2=value2...", append the API
 * secret directly (no separator), then SHA-1 the result. The client uploads
 * directly to Cloudinary with this signature — the file itself never passes
 * through our server. See https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
export function signCloudinaryParams(params: Record<string, string | number>): string {
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}
