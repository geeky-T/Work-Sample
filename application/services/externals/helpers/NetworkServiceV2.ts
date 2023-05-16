/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosRequestConfig } from 'axios';
import attachLoggerToAxiosClient, { CustomAxiosInstance } from './axiosLogger';

const isFunction = (argument: any): boolean => typeof argument === 'function';

type RequestConfig = {
  headers?: Record<string, any>;
  params?: Record<string, any>;
  restConfig?: Omit<Omit<AxiosRequestConfig, 'params'>, 'headers'>;
};

type RequestParameter = {
  errorCallback?: CallableFunction;
  path: string;
  successCallback?: CallableFunction;
  body?: any;
} & RequestConfig;

class NetworkService {
  #_baseUri: string;

  #_client: CustomAxiosInstance;

  #_defaults: { headers: Record<string, any>; params: Record<string, any> } = {
    headers: {},
    params: {},
  };

  constructor(baseUrl: string, serviceName = '', enableLogging = true) {
    this.#_baseUri = baseUrl;
    this.#_client = axios.create() as CustomAxiosInstance;
    if (enableLogging) {
      attachLoggerToAxiosClient(this.#_client, serviceName);
    }
  }

  #_getRequestConfig = ({ headers = {}, params: parameters = {}, restConfig = {} }: RequestConfig): AxiosRequestConfig => {
    return {
      headers: { ...this.#_defaults.headers, ...headers },
      params: { ...this.#_defaults.params, ...parameters },
      ...restConfig,
    };
  };

  setDefaultHeaders(headers: Record<string, unknown>): void {
    this.#_defaults.headers = headers;
  }

  setDefaultParams(parameters: Record<string, unknown>): void {
    this.#_defaults.params = parameters;
  }

  async get({ errorCallback, headers, params, path, restConfig, successCallback }: RequestParameter): Promise<any> {
    const config = this.#_getRequestConfig({ headers, params, restConfig });
    const computedUrl = this.#_baseUri + path;

    try {
      const response = await this.#_client.get(computedUrl, config);
      if (successCallback && isFunction(successCallback)) {
        successCallback(response.data);
      }
      return response.data;
    } catch (error: any) {
      if (errorCallback && isFunction(errorCallback)) {
        errorCallback(error);
      }
      throw error;
    }
  }

  async post({ body, errorCallback, headers, params, path, restConfig, successCallback }: RequestParameter): Promise<any> {
    const config = this.#_getRequestConfig({ headers, params, restConfig });
    const computedUrl = this.#_baseUri + path;

    try {
      const response = await this.#_client.post(computedUrl, body, config);
      if (successCallback && isFunction(successCallback)) {
        successCallback(response.data);
      }
      return response.data;
    } catch (error: any) {
      if (errorCallback && isFunction(errorCallback)) {
        errorCallback(error);
      }
      throw error;
    }
  }

  async put({ body, errorCallback, headers, params, path, restConfig, successCallback }: RequestParameter): Promise<any> {
    const config = this.#_getRequestConfig({ headers, params, restConfig });
    const computedUrl = this.#_baseUri + path;

    try {
      const response = await this.#_client.put(computedUrl, body, config);
      if (successCallback && isFunction(successCallback)) {
        successCallback(response.data);
      }
      return response.data;
    } catch (error: any) {
      if (errorCallback && isFunction(errorCallback)) {
        errorCallback(error);
      }
      throw error;
    }
  }

  async patch({ body, errorCallback, headers, params, path, restConfig, successCallback }: RequestParameter): Promise<any> {
    const config = this.#_getRequestConfig({ headers, params, restConfig });
    const computedUrl = this.#_baseUri + path;

    try {
      const response = await this.#_client.patch(computedUrl, body, config);
      if (successCallback && isFunction(successCallback)) {
        successCallback(response.data);
      }
      return response.data;
    } catch (error: any) {
      if (errorCallback && isFunction(errorCallback)) {
        errorCallback(error);
      }
      throw error;
    }
  }

  async delete({ errorCallback, headers, params, path, restConfig, successCallback }: RequestParameter): Promise<any> {
    const config = this.#_getRequestConfig({ headers, params, restConfig });
    const computedUrl = this.#_baseUri + path;

    try {
      const response = await this.#_client.delete(computedUrl, config);
      if (successCallback && isFunction(successCallback)) {
        successCallback(response.data);
      }
      return response.data;
    } catch (error: any) {
      if (errorCallback && isFunction(errorCallback)) {
        errorCallback(error);
      }
      throw error;
    }
  }
}

export default NetworkService;
