import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const FILEBASE_ENDPOINT = "https://s3.filebase.com";
const FILEBASE_REGION = "us-east-1";

function getFilebaseClient(): S3Client {
  const accessKey = process.env.FILEBASE_ACCESS_KEY;
  const secretKey = process.env.FILEBASE_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error("Missing FILEBASE_ACCESS_KEY or FILEBASE_SECRET_KEY");
  }
  return new S3Client({
    region: FILEBASE_REGION,
    endpoint: FILEBASE_ENDPOINT,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function getBucket(): string {
  const bucket = process.env.FILEBASE_BUCKET;
  if (!bucket) throw new Error("Missing FILEBASE_BUCKET");
  return bucket;
}

export async function getPresignedReadUrl(
  key: string,
  expiresInSeconds: number
): Promise<string> {
  const client = getFilebaseClient();
  const bucket = getBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
