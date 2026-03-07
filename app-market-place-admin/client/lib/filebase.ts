import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const FILEBASE_ENDPOINT = "https://s3.filebase.com";
const FILEBASE_REGION = "us-east-1";

function getFilebaseClient(): S3Client {
  const accessKey = process.env.FILEBASE_ACCESS_KEY;
  const secretKey = process.env.FILEBASE_SECRET_KEY;
  const bucket = process.env.FILEBASE_BUCKET;
  if (!accessKey || !secretKey || !bucket) {
    throw new Error(
      "Missing FILEBASE_ACCESS_KEY, FILEBASE_SECRET_KEY, or FILEBASE_BUCKET"
    );
  }
  return new S3Client({
    region: FILEBASE_REGION,
    endpoint: FILEBASE_ENDPOINT,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: false,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function getBucket(): string {
  const bucket = process.env.FILEBASE_BUCKET;
  if (!bucket) throw new Error("Missing FILEBASE_BUCKET");
  return bucket;
}

export const UPLOAD_CONTENT_TYPE_APK = "application/vnd.android.package-archive";

export async function getPresignedUploadUrl(
  key: string,
  expiresInSeconds = 900,
  contentType: string = UPLOAD_CONTENT_TYPE_APK
): Promise<string> {
  const client = getFilebaseClient();
  const bucket = getBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

const MAX_READ_URL_EXPIRY_SECONDS = 6 * 24 * 3600;

export async function getPresignedReadUrl(
  key: string,
  expiresInSeconds = MAX_READ_URL_EXPIRY_SECONDS
): Promise<string> {
  const client = getFilebaseClient();
  const bucket = getBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function objectExists(key: string): Promise<boolean> {
  const client = getFilebaseClient();
  const bucket = getBucket();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
