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
