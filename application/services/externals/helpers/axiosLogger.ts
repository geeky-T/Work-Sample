/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable id-length */
import { AsyncLocalStorage } from '@procurenetworks/backend-utils';
import { AxiosInstance, AxiosInterceptorManager, AxiosRequestConfig, AxiosResponse } from 'axios';
import generateUniqueId from 'generate-unique-id';

interface CustomRequestConfig extends AxiosRequestConfig {
  requestId: string;
}
interface CustomAxiosResponse extends Omit<AxiosResponse, 'config'> {
  config: CustomRequestConfig;
}

export interface CustomAxiosInstance extends AxiosInstance {
  interceptors: {
    request: AxiosInterceptorManager<CustomRequestConfig>;
    response: AxiosInterceptorManager<CustomAxiosResponse>;
  };
}

const attachLoggerToAxiosClient = (client: CustomAxiosInstance, serviceName = ''): void => {
  client.interceptors.request.use((x) => {
    const headers = {
      ...x.headers.common,
      ...x.headers[x.method!],
      ...x.headers,
    };

    ['common', 'get', 'post', 'head', 'put', 'patch', 'delete'].forEach((header) => {
      delete headers[header];
    });

    let requestId = AsyncLocalStorage.get('requestId');

    if (!requestId) {
      requestId = generateUniqueId({
        excludeSymbols: ['0', 'o', 'O'],
        length: 8,
        useLetters: true,
        useNumbers: true,
      });
    }

    x.requestId = requestId;

    const printable = `\u001B[34m${serviceName}-Request\u001B[0m: [${x.requestId}]: ${x.method!.toUpperCase()} | URL: ${
      x.url
    } | Parameters: ${JSON.stringify(x.params)} | Body: ${JSON.stringify(x.data)} | Headers: ${JSON.stringify(headers)}\n`;
    // eslint-disable-next-line no-console
    console.log(printable);

    return x;
  });

  client.interceptors.response.use(
    (x) => {
      const printable = `\u001B[32m${serviceName}-Response\u001B[0m: [${x.config.requestId}] : \u001B[32m${
        x.status
      }\u001B[0m | ${JSON.stringify(x.data)}\n`;
      // eslint-disable-next-line no-console
      console.log(printable);

      return x;
    },
    (x) => {
      const printable = `\u001B[31m${serviceName}-Response\u001B[0m: [${x.config.requestId}] : \u001B[31m${
        x.response.status
      }\u001B[0m | ${JSON.stringify(x.response.data)}\n`;
      // eslint-disable-next-line no-console
      console.log(printable);

      throw x;
    },
  );
};

export default attachLoggerToAxiosClient;
