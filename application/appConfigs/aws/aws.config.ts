import { UndefinedError } from '@procurenetworks/backend-utils';

export class AWSConfigs {
  // eslint-disable-next-line no-use-before-define
  private static awsConfigs: AWSConfigs;

  static getInstance(): AWSConfigs {
    if (!this.awsConfigs) {
      this.awsConfigs = new AWSConfigs();
    }
    return this.awsConfigs;
  }

  get s3UploadBucket(): string {
    if (!process.env.AWS_S3_BUCKET) {
      throw new UndefinedError({
        debugMessage: `AWS_S3_BUCKET env variable not found/defined`,
        where: `AWSConfigs.s3UploadBucket : ${new Error().stack}`,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      });
    }
    return process.env.AWS_S3_BUCKET;
  }

  get credentials(): { accessKeyId: string; secretAccessKey: string } {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new UndefinedError({
        debugMessage: 'AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not found/defined',
        where: `AWSConfigs.credentials : ${new Error().stack}`,
        message: "A technical issue occurred. We've logged the issue. You may be able to try again.",
      });
    }
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }
}
