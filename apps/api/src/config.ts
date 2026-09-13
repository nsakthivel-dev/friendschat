import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "development-secret-change-me",
  webOrigin: process.env.WEB_ORIGIN || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  redisUrl: process.env.REDIS_URL || undefined,
  s3: process.env.S3_ENDPOINT ? {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET || "friendschat",
    region: process.env.S3_REGION || "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY || "",
    secretKey: process.env.S3_SECRET_KEY || ""
  } : undefined
};
