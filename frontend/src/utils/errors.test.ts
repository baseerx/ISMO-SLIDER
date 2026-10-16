import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getErrorMessage, getFieldErrors } from './errors';

const makeError = (status: number, data: unknown) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } });

describe('getErrorMessage', () => {
  it('reports connection problems', () => {
    expect(getErrorMessage(new AxiosError('Network Error'))).toBe('Unable to connect to the server. Please try again.');
  });
  it('prefers the API detail message', () => {
    expect(getErrorMessage(makeError(401, { detail: 'Invalid username or password.' }))).toBe('Invalid username or password.');
  });
  it('hides server errors behind the fallback', () => {
    expect(getErrorMessage(makeError(500, '<html>Traceback</html>'), 'Fallback')).toBe('Fallback');
  });
});

describe('getFieldErrors', () => {
  it('maps DRF validation errors to the first message per field', () => {
    expect(getFieldErrors(makeError(400, { image: ['Too big.'], name: ['Required.'] }))).toEqual({ image: 'Too big.', name: 'Required.' });
  });
});
