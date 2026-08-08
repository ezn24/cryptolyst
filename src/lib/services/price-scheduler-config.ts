export const MINUTE_MS = 60_000;
const DEFAULT_INTERVAL_MINUTES = 5;
const MAX_INTERVAL_MINUTES = 1_440;

export function validPriceRefreshMinutes(value: unknown) {
  const minutes = typeof value === "number" ? value : Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_INTERVAL_MINUTES
    ? minutes
    : null;
}

export function priceRefreshIntervalMs(
  configuredMinutes: unknown,
  fallbackMinutes: unknown = DEFAULT_INTERVAL_MINUTES,
) {
  const minutes =
    validPriceRefreshMinutes(configuredMinutes) ??
    validPriceRefreshMinutes(fallbackMinutes) ??
    DEFAULT_INTERVAL_MINUTES;
  return minutes * MINUTE_MS;
}
