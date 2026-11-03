/**
 * Currency utilities for handling monetary amounts in integer paise (INR).
 *
 * CRITICAL RULE:
 * Always store and calculate monetary amounts as integer paise (1 Rupee = 100 Paise).
 * Never use floating-point numbers for financial calculations or storage.
 */

/**
 * Formats integer paise into a human-readable Indian Rupee string (e.g. 15050 paise -> "₹150.50")
 * Uses standard Indian numbering system (lakhs, crores).
 */
export function formatPaiseToINR(paise: number, includeSymbol = true): string {
  if (typeof paise !== "number" || isNaN(paise)) {
    return includeSymbol ? "₹0.00" : "0.00";
  }

  const rupees = paise / 100;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);

  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Converts a rupee decimal input (e.g., from an admin form) to integer paise safely.
 * Rounds to nearest integer to avoid IEEE 754 floating-point inaccuracies.
 */
export function rupeesToPaise(rupees: number | string): number {
  const numeric = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (isNaN(numeric) || numeric < 0) {
    return 0;
  }
  return Math.round(numeric * 100);
}

/**
 * Converts integer paise to a plain rupee number for input forms.
 */
export function paiseToRupees(paise: number): number {
  if (typeof paise !== "number" || isNaN(paise)) return 0;
  return paise / 100;
}
