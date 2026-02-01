/**
 * Shared formatting utilities for balances and monetary values.
 * Ensures consistent thousand separators and decimal places (e.g. 1,000,000.00).
 */

/**
 * Format a numeric balance or monetary value with thousand separators and fixed decimals.
 * @param value - Numeric value to format
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted string, e.g. "1,000,000.00"
 */
export function formatBalance(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
