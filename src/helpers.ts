import * as core from '@actions/core';

export interface ExchangeTokenResponse {
  access_token: string;
  issued_token_type: string;
  token_type: string;
}

/**
 * Retrieves an OIDC ID token for the specified audience.
 */
export async function getIDToken(audience: string): Promise<string> {
  try {
    return await retryAndBackoff(() => core.getIDToken(audience), {
      maxRetries: 5,
      isRetryable: false,
    });
  } catch (error) {
    throw new Error(`getIDToken call failed: ${errorMessage(error)}`);
  }
}

/**
 * Exchanges an ID token for an access token using a token exchange endpoint.
 */
export async function exchangeToken(
  exchangeEndpoint: string,
  idToken: string,
  customAttributes: Record<string, unknown> = {},
): Promise<ExchangeTokenResponse> {
  if (!idToken) {
    throw new Error('idToken is required');
  }

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: idToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
  });

  if (Object.keys(customAttributes).length > 0) {
    params.append('custom_attributes', JSON.stringify(customAttributes));
  }

  try {
    const response = await retryAndBackoff(
      () =>
        fetch(exchangeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'Cache-Control': 'no-store',
          },
          body: params.toString(),
        }).then((res) => {
          if (!res.ok) {
            throw new Error(`Token exchange failed with status: ${res.status} - ${res.statusText}`);
          }
          return res;
        }),
      {
        maxRetries: 5,
        isRetryable: false,
      },
    );

    return (await response.json()) as ExchangeTokenResponse;
  } catch (error) {
    throw new Error(`exchangeToken call failed: ${errorMessage(error)}`);
  }
}

/**
 * Extracts a consistent error message.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Utility for delaying execution.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff.
 */
interface RetryOptions {
  isRetryable: boolean;
  maxRetries?: number;
  baseDelayMs?: number;
  attempt?: number;
}

export async function retryAndBackoff<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { isRetryable, maxRetries = 12, baseDelayMs = 50, attempt = 0 } = options;

  try {
    return await fn();
  } catch (err) {
    if (!isRetryable || attempt >= maxRetries) {
      throw err;
    }

    const delay = Math.random() * (2 ** attempt * baseDelayMs);
    await sleep(delay);

    return retryAndBackoff(fn, {
      ...options,
      attempt: attempt + 1,
    });
  }
}
