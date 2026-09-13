import { config } from "../config.js";

export type UploadResult = { url: string; key: string };
/** Storage seam for S3-compatible providers. Wire an SDK in production. */
export async function uploadAttachment(key: string, _data: Buffer, _contentType: string): Promise<UploadResult> {
  if (!config.s3) throw new Error("S3 storage is not configured");
  return { key, url: `${config.s3.endpoint.replace(/\/$/, "")}/${config.s3.bucket}/${key}` };
}
