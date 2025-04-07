export declare function errorMessage(error: unknown): string;
export declare function sleep(ms: number): Promise<unknown>;
export declare function retryAndBackoff<T>(fn: () => Promise<T>, isRetryable: boolean, maxRetries?: number, retries?: number, base?: number): Promise<T>;
