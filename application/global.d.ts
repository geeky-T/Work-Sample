declare module 'generate-unique-id' {
  export default function (config: {
    length?: number;
    useLetters?: boolean;
    useNumbers?: boolean;
    includeSymbols?: string[];
    excludeSymbols?: string[];
  }): string;
}
declare module 'mime' {
  export function getExtension(mime: string): string | undefined;
}

declare module 'koa-request-to-curl';

declare namespace NodeJS {
  export interface ProcessEnv {
    APP_ROOT_DIRECTORY: string;
    AUTH_COOKIE_NAME: string;
    AUTH_JWT_TOKEN: string;
    AWS_S3_BUCKET: string;
    AWS_S3_KEY: string;
    AWS_S3_SECRET: string;
    AWS_S3_ROOT: string;
    AWS_S3_REGION: string;
    BASE_UI_DOMAIN: string;
    BASE_API_DOMAIN: string;
    DEPLOYMENT_ENVIRONMENT: string;
    EMAIL_SERVICE_BASE_URL: string;
    GRPC_PORT: string;
    HTTP_PORT: string;
    MONGODB_URI: string;
    NODE_ENV: string;
    ORDER_REQUEST_UI_URL: string;
    ORDER_REQUEST_SERVICE_BASE_URL: string;
    SENTRY_DSN: string;
  }
}
