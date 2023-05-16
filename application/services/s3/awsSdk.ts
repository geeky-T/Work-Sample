import assert from 'assert';
import AWS from 'aws-sdk';

export const {
  env: { AWS_S3_BUCKET: BUCKET_NAME, AWS_S3_KEY, AWS_S3_SECRET, AWS_S3_ROOT, AWS_S3_REGION },
} = process;

assert.ok(BUCKET_NAME, 'Missing AWS_S3_BUCKET values in environment variables');
assert.ok(AWS_S3_KEY, 'Missing AWS_S3_KEY values in environment variables');
assert.ok(AWS_S3_SECRET, 'Missing AWS_S3_SECRET values in environment variables');
assert.ok(AWS_S3_ROOT, 'Missing AWS_S3_ROOT values in environment variables');
assert.ok(AWS_S3_REGION, 'Missing AWS_S3_REGION values in environment variables');

export const s3Storage = new AWS.S3({
  accessKeyId: AWS_S3_KEY,
  secretAccessKey: AWS_S3_SECRET,
});

export const s3BaseUrl = `https://${BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/`;
