// Cloudflare R2 client (S3-compatible).
// Uses @aws-sdk/client-s3 + helpers from @aws-sdk/s3-presigned-post
// (for direct customer uploads) and @aws-sdk/s3-request-presigner
// (for admin signed GET URLs).

import { S3Client } from '@aws-sdk/client-s3';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var: ${name}. Set it in .env (locally) or in Vercel project settings.`
    );
  }
  return v;
}

export const r2AccountId = () => requiredEnv('R2_ACCOUNT_ID');
export const r2AccessKeyId = () => requiredEnv('R2_ACCESS_KEY_ID');
export const r2SecretAccessKey = () => requiredEnv('R2_SECRET_ACCESS_KEY');
export const r2BucketName = () => requiredEnv('R2_BUCKET_NAME');
export const r2Endpoint = () =>
  process.env.R2_ENDPOINT ||
  `https://${r2AccountId()}.r2.cloudflarestorage.com`;

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint(),
    credentials: {
      accessKeyId: r2AccessKeyId(),
      secretAccessKey: r2SecretAccessKey(),
    },
    forcePathStyle: true,
  });
  return _client;
}

export function r2PublicUrl(objectKey: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/${objectKey.replace(/^\//, '')}`;
}
