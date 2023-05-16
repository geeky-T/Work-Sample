import isBase64 from 'is-base64';

export const isFileStringInBase64 = (base64String: string): boolean => {
  return isBase64(base64String, { allowMime: true });
};
