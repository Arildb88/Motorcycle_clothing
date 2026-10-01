import axios from 'axios';

export type OrsHttpResponse = {
  status: number;
  data: unknown;
};

export type OrsHttpPost = (
  url: string,
  body: unknown,
  headers: Record<string, string>,
) => Promise<OrsHttpResponse>;

export type OrsHttpGet = (
  url: string,
  headers: Record<string, string>,
) => Promise<OrsHttpResponse>;

const timeoutMs = 15_000;

/** Status-tolerant POST. Callers must not log the body (it contains coordinates). */
export const orsPost: OrsHttpPost = async (url, body, headers) => {
  const res = await axios.post(url, body, {
    headers,
    timeout: timeoutMs,
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data };
};

/** Status-tolerant GET. Callers must not log the URL (it may contain a search string). */
export const orsGet: OrsHttpGet = async (url, headers) => {
  const res = await axios.get(url, {
    headers,
    timeout: timeoutMs,
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data };
};

export function orsAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: apiKey,
    Accept: 'application/json, application/geo+json',
  };
}
