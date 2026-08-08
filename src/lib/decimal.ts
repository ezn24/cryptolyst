import Decimal from "decimal.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 40,
});

export { Decimal };

export type DecimalInput = Decimal.Value;

export function D(value: DecimalInput | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  return new Decimal(value);
}

export function decimalString(value: DecimalInput, dp = 8): string {
  const decimal = D(value);
  if (decimal.isZero()) return "0";
  return decimal.toDecimalPlaces(dp).toFixed();
}

export function money(value: DecimalInput, currency = "USDT", dp = 2): string {
  return `${D(value).toDecimalPlaces(dp).toFixed()} ${currency}`;
}

export function pct(value: DecimalInput, dp = 2): string {
  return `${D(value).toDecimalPlaces(dp).toFixed()}%`;
}

