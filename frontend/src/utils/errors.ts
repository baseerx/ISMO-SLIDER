import { AxiosError } from 'axios';
import { ApiErrorBody } from '../types';

export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(err instanceof AxiosError)) return fallback;
  if (!err.response) return 'Unable to connect to the server. Please try again.';
  const data = err.response.data as ApiErrorBody | undefined;
  if (data?.detail) return data.detail;
  if (err.response.status >= 500) return fallback;
  const first = data && Object.values(data)[0];
  return (Array.isArray(first) ? first[0] : first) ?? fallback;
}

export function getFieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof AxiosError) || err.response?.status !== 400) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries((err.response.data ?? {}) as ApiErrorBody)) if (v) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}
