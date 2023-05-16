import { InternalServerError, logger } from '@procurenetworks/backend-utils';
import { AWS_S3_ROOT, BUCKET_NAME, s3BaseUrl, s3Storage } from './awsSdk';

const prepareFileParametersForS3 = (fileContent: any) => {
  const { fileName, fileData, contentEncoding, contentType, acl } = fileContent;
  return {
    ACL: acl,
    Body: fileData,
    Bucket: BUCKET_NAME,
    ContentEncoding: contentEncoding,
    ContentType: contentType,
    Key: `${AWS_S3_ROOT}/uploads/orders/${fileName}`,
  };
};

export const uploadFileToS3AndGetUrl = async (fileContent: Record<string, unknown>): Promise<string> => {
  try {
    const parameters = prepareFileParametersForS3(fileContent);
    await s3Storage.putObject(parameters).promise();
    return s3BaseUrl + parameters.Key;
  } catch (error: any) {
    logger.error({ error, message: 'Failed to Upload Image on S3' });
    throw new InternalServerError({
      error,
      debugMessage: 'Unknown error - Failed to Upload Image on S3.',
      message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      params: {
        fileContent,
      },
      report: true,
      where: 's3UploadService - uploadFileToS3AndGetUrl',
    });
  }
};
