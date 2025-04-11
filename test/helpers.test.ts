import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as core from '@actions/core';
import { getIDToken, exchangeToken, errorMessage, sleep, retryAndBackoff } from '../src/helpers';

// Mock the @actions/core module
vi.mock('@actions/core', () => ({
  getIDToken: vi.fn(),
}));

// Mock the fetch API
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

    await expect(getIDToken(audience)).rejects.toThrow('getIDToken call failed: getIDToken failed');
  });
});

describe('exchangeToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an access token', async () => {
    const mockResponse = { access_token: 'mock-access-token' };
    (fetch as Mock).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const tokenbridgeUrl = 'https://mock-tokenbridge-url.com/exchange';
    const idToken = 'mock-id-token';
    const response = await exchangeToken(tokenbridgeUrl, idToken, {role: 'user'});

    expect(fetch).toHaveBeenCalledWith(`${tokenbridgeUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken, custom_claims: {role: 'user'} }),
    });
    expect(response).toEqual(mockResponse);
  });

  it('should throw an error if the response is not ok', async () => {
    (fetch as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const tokenbridgeUrl = 'https://mock-tokenbridge-url.com/exchange';
    const idToken = 'mock-id-token';

    await expect(exchangeToken(tokenbridgeUrl, idToken)).rejects.toThrow(
      'Token exchange failed with status: 500 - Internal Server Error'
    );
  });

  it('should throw an error if fetch fails', async () => {
    (fetch as Mock).mockRejectedValue(new Error('Network error'));

    const tokenbridgeUrl = 'https://mock-tokenbridge-url.com/exchange';
    const idToken = 'mock-id-token';

    await expect(exchangeToken(tokenbridgeUrl, idToken)).rejects.toThrow(
      'exchangeToken call failed: Network error'
    );
  });
});

describe('errorMessage', () => {
  it('should return the error message if the input is an Error', () => {
    const error = new Error('Test error');
    expect(errorMessage(error)).toBe('Test error');
  });

  it('should return the string representation of the input if it is not an Error', () => {
    expect(errorMessage('Test string')).toBe('Test string');
    expect(errorMessage(123)).toBe('123');
  });
});

describe('sleep', () => {
  it('should resolve after the specified time', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(100);
  });
});

describe('retryAndBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the result of the function if it succeeds', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    const result = await retryAndBackoff(mockFn, true);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result).toBe('success');
  });

  it('should retry the function if it fails and isRetryable is true', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValue('success');

    const result = await retryAndBackoff(mockFn, true);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(result).toBe('success');
  });

  it('should throw an error if the function fails and isRetryable is false', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Permanent error'));

    await expect(retryAndBackoff(mockFn, false)).rejects.toThrow('Permanent error');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if the function exceeds the maximum retries', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Temporary error'));

    await expect(retryAndBackoff(mockFn, true, 3)).rejects.toThrow('Temporary error');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});