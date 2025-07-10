/**
 * Utility function to wait for a specified number of milliseconds
 * @param ms - Number of milliseconds to wait
 * @returns Promise that resolves after the specified delay
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Alternative implementation with AbortController support for cancellable delays
 * @param ms - Number of milliseconds to wait
 * @param signal - Optional AbortSignal to cancel the delay
 * @returns Promise that resolves after the specified delay or rejects if aborted
 */
export const delayWithCancel = (
  ms: number,
  signal?: AbortSignal
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Delay was aborted"));
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve();
    }, ms);

    signal?.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(new Error("Delay was aborted"));
    });
  });
};

/**
 * Sleep function (alias for delay) - more familiar name for some developers
 * @param ms - Number of milliseconds to wait
 * @returns Promise that resolves after the specified delay
 */
export const sleep = delay;
