import * as core from '@actions/core';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  errorMessage,
  exchangeToken,
  getIDToken,
  retryAndBackoff,
  sleep,
} from '../src/helpers';

vi.mock('@actions/core', () => ({
  getIDToken: vi.fn(),
}));

global.fetch = vi.fn();

describe('getIDToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an ID token', async () => {
    (core.getIDToken as Mock).mockResolvedValue('mock-id-token');
    const audience = 'mock-audience';
    const idToken = await getIDToken(audience);

    expect(core.getIDToken).toHaveBeenCalledWith(audience);
    expect(idToken).toBe('mock-id-token');
  });

  it('should throw an error if getIDToken fails', async () => {
    (core.getIDToken as Mock).mockRejectedValue(new Error('getIDToken failed'));
    const audience = 'mock-audience';

    await expect(getIDToken(audience)).rejects.toThrow(
      'getIDToken call failed: getIDToken failed',
    );
  });
});

describe('exchangeToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an access token', async () => {
    const mockResponse = {
      access_token: 'mock-access-token',
      issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      token_type: 'Bearer',
    };
    (fetch as Mock).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const tokenbridgeUrl = 'https://mock-tokenbridge-url.com/exchange';
    const idToken = 'mock-id-token';
    const customClaims = { role: 'user' };
    const response = await exchangeToken(tokenbridgeUrl, idToken, customClaims);

    expect(fetch).toHaveBeenCalledWith(tokenbridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'Cache-Control': 'no-store',
      },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange&subject_token=mock-id-token&subject_token_type=urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Aid_token&custom_attributes=${encodeURIComponent(
        JSON.stringify(customClaims),
      )}`,
    });

    expect(response).toEqual(mockResponse);
  });

  it('should throw an error if the response is not ok', async () => {
    (fetch as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(
      exchangeToken('https://mock-tokenbridge-url.com/exchange', 'mock-id-token'),
    ).rejects.toThrow(
      'Token exchange failed with status: 500 - Internal Server Error',
    );
  });

  it('should throw an error if fetch fails', async () => {
    (fetch as Mock).mockRejectedValue(new Error('Network error'));

    await expect(
      exchangeToken('https://mock-tokenbridge-url.com/exchange', 'mock-id-token'),
    ).rejects.toThrow('exchangeToken call failed: Network error');
  });
});

describe('errorMessage', () => {
  it('should return the error message if input is an Error', () => {
    expect(errorMessage(new Error('Test error'))).toBe('Test error');
  });

  it('should return string representation of non-Error input', () => {
    expect(errorMessage('string error')).toBe('string error');
    expect(errorMessage(42)).toBe('42');
  });
});

describe('sleep', () => {
  it('should resolve after approximately given time', async () => {
    const start = Date.now();
    await sleep(50);
    const duration = Date.now() - start;
    expect(duration).toBeGreaterThanOrEqual(50);
  });
});

describe('retryAndBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return result if function succeeds', async () => {
    const mockFn = vi.fn().mockResolvedValue('done');

    const result = await retryAndBackoff(mockFn, { isRetryable: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result).toBe('done');
  });

  it('should retry once if first call fails and isRetryable is true', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const result = await retryAndBackoff(mockFn, { isRetryable: true, maxRetries: 2 });
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(result).toBe('success');
  });

  it('should throw if not retryable', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('hard error'));

    await expect(retryAndBackoff(mockFn, { isRetryable: false })).rejects.toThrow(
      'hard error',
    );
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should fail after exceeding retries', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('retry error'));

    await expect(
      retryAndBackoff(mockFn, { isRetryable: true, maxRetries: 3 }),
    ).rejects.toThrow('retry error');
    expect(mockFn).toHaveBeenCalledTimes(4);
  });
});
