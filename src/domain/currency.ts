/**
 * Currency utilities using integer paise/cents internally to prevent IEEE-754 floating-point drift.
 * 1 Indian Rupee (₹1) = 100 cents/paise.
 */

const AMOUNT_REGEX = /^\d+(?:\.\d{0,2})?$/;

/**
 * Parses a user-entered Rupee amount string (e.g., "1200", "1,200.50", "400.5")
 * into exact integer paise without floating-point arithmetic.
 * Returns null if invalid or negative.
 */
export function parseRupeesToCents(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, '').trim();
  if (!cleaned || !AMOUNT_REGEX.test(cleaned)) {
    return null;
  }

  const [wholePart, decimalPart = ''] = cleaned.split('.');
  const rupees = Number.parseInt(wholePart, 10);
  if (!Number.isSafeInteger(rupees)) {
    return null;
  }

  const paddedDecimals = decimalPart.padEnd(2, '0');
  const paise = Number.parseInt(paddedDecimals, 10);
  const totalCents = rupees * 100 + paise;

  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    return null;
  }

  return totalCents;
}

/**
 * Converts integer cents into an editable numeric string (e.g. 120000 -> "1200", 125050 -> "1250.50").
 */
export function centsToInputString(amountCents: number): string {
  const safe = Math.trunc(amountCents);
  if (safe === 0) return '0';
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  if (paise === 0) {
    return `${sign}${rupees}`;
  }
  return `${sign}${rupees}.${String(paise).padStart(2, '0')}`;
}

/**
 * Formats integer cents as Indian Rupees using Indian digit grouping (e.g., ₹1,20,000 or ₹1,200.50).
 */
export function formatINR(
  amountCents: number,
  options?: { showSign?: boolean; alwaysShowDecimals?: boolean }
): string {
  const safe = Math.trunc(amountCents);
  const isNegative = safe < 0;
  const abs = Math.abs(safe);
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;

  const formattedRupees = rupees.toLocaleString('en-IN');
  const decimalSuffix =
    options?.alwaysShowDecimals || paise !== 0
      ? `.${String(paise).padStart(2, '0')}`
      : '';

  let prefix = '';
  if (isNegative) {
    prefix = '-';
  } else if (options?.showSign && safe > 0) {
    prefix = '+';
  }

  return `${prefix}₹${formattedRupees}${decimalSuffix}`;
}

/**
 * Optional explicit helper: divides an integer cent total across N members,
 * distributing any remainder paise (1 cent each) to the first members so the sum
 * matches totalCents exactly. Only called when the user explicitly clicks "Split Equally".
 */
export function splitCentsEqually(totalCents: number, memberCount: number): number[] {
  if (memberCount <= 0 || totalCents <= 0) {
    return [];
  }
  const base = Math.floor(totalCents / memberCount);
  const remainder = totalCents % memberCount;
  return Array.from({ length: memberCount }, (_, idx) => base + (idx < remainder ? 1 : 0));
}
