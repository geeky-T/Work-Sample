import { InternalServerError, logger, ValidationError } from '@procurenetworks/backend-utils';
import generateUniqueId from 'generate-unique-id';
import mime from 'mime';
import { uploadFileToS3AndGetUrl } from '../../s3/s3UploadService';

const _generateUniqueFileName = (imageExtension: string) => {
  const currentTime = new Date();
  return `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}-${currentTime.getDay()}_${generateUniqueId({
    length: 7,
  })}_${currentTime.getTime()}.${imageExtension}`;
};

function _decodeBase64Image(dataString: string) {
  const matches = dataString.match(/^data:([+/A-Za-z-]+);base64,(.+)$/);
  if (!matches) {
    logger.error({
      imageString: dataString,
      message: 'Image string provided is not a valid base64 string',
    });
    throw new ValidationError({
      debugMessage: `Image string provided is not a valid base64 string.`,
      message: `Image uploading failed.`,
      params: { dataString },
      where: 'itemImageUploader - _decodeBase64Image',
    });
  }
  const response = {};

  // Below condition will fetch file Type and data from Base64 string to verify that we are adding condition that it should contains 3 matches results
  if (matches.length !== 3) {
    logger.error({
      imageString: dataString,
      matches,
      message: 'Could not determine 3 parts of base64 image string provided',
    });
    throw new ValidationError({
      debugMessage: `Could not determine 3 parts of base64 image string provided.`,
      message: `Image uploading failed.`,
      params: { dataString, matches },
      where: 'itemImageUploader - _decodeBase64Image',
    });
  }

  return {
    ...response,
    data: Buffer.from(matches[2], 'base64'),
    type: matches[1],
  };
}

export const uploadFileAndGetFileUrl = async (dataString: string): Promise<string> => {
  try {
    const decodedImageData = _decodeBase64Image(dataString);
    const imageExtension = mime.getExtension(decodedImageData.type);
    if (!imageExtension) {
      logger.error({
        imageString: dataString,
        message: 'Could not determine the extension from the base64 image string',
      });
      throw new ValidationError({
        debugMessage: `Could not determine the extension from the base64 image string.`,
        message: `Image uploading failed.`,
        params: { dataString },
        where: 'itemImageUploader - uploadFileAndGetFileUrl',
      });
    }
    const fileName = _generateUniqueFileName(imageExtension);
    return await uploadFileToS3AndGetUrl({
      acl: 'public-read',
      contentEncoding: 'base64',
      contentType: decodedImageData.type,
      fileData: decodedImageData.data,
      fileName,
    });
  } catch (error: any) {
    logger.error({ error, message: 'Error in uploadFileAndGetFileUrl' });
    throw new InternalServerError({
      error,
      debugMessage: `Unknown error occurred uploading item image.`,
      message: `Image uploading failed.`,
      params: { dataString },
      report: true,
      where: 'itemImageUploader - uploadFileAndGetFileUrl',
    });
  }
};
