import * as core from '@actions/core';

export interface ExchangeTokenResponse {
  access_token: string;
  issued_token_type: string;
  token_type: string;
}

export async function getIDToken(audience: string): Promise<string> {
  try {
    return await retryAndBackoff(
      async () => {
        return core.getIDToken(audience);
      },
      false,
      5,
    );
  } catch (error) {
    throw new Error(`getIDToken call failed: ${errorMessage(error)}`);
  }
}

export async function exchangeToken(
  exchangeEndpoint: string,
  idToken: string,
  customAttributes: Record<string, unknown> = {},
): Promise<ExchangeTokenResponse> {
  try {
    const formBody: string[] = [];
    formBody.push(`subject_token=${encodeURIComponent(idToken)}`);
    if (Object.keys(customAttributes).length > 0) {
      formBody.push(`requested_claims=${encodeURIComponent(JSON.stringify(customAttributes))}`);
    }

    const response = await retryAndBackoff(
      async () => {
        const res = await fetch(`${exchangeEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'Cache-Control': 'no-store',
          },
          body: formBody.join('&'),
        });

        if (!res.ok) {
          throw new Error(`Token exchange failed with status: ${res.status} - ${res.statusText}`);
        }

        return res;
      },
      false,
      5, // Retry up to 5 times
    );

    return (await response.json()) as ExchangeTokenResponse;
  } catch (error) {
    throw new Error(`exchangeToken call failed: ${errorMessage(error)}`);
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryAndBackoff<T>(
  fn: () => Promise<T>,
  isRetryable: boolean,
  maxRetries = 12,
  retries = 0,
  base = 50,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isRetryable) {
      throw err;
    }

    await sleep(Math.random() * (2 ** retries * base));
    // biome-ignore lint/style/noParameterAssign: This is a loop variable
    retries += 1;
    if (retries >= maxRetries) {
      throw err;
    }
    return await retryAndBackoff(fn, isRetryable, maxRetries, retries, base);
  }
}
