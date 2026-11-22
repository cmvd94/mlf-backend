/**
 * Utility functions for Indian currency, quantity, and rate formatting matching Tally specifications.
 */

export const formatIndianCurrency = (value: number | undefined | null): string => {
  const num = typeof value === "number" && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatQuantity = (
  quantity: number | undefined | null,
  uomSymbol?: string,
  decimals: number = 3
): string => {
  const num = typeof quantity === "number" && !isNaN(quantity) ? quantity : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
  return uomSymbol && uomSymbol.trim().length > 0 ? `${formatted} ${uomSymbol.trim()}` : formatted;
};

export const formatRate = (rate: number | undefined | null, decimals: number = 2): string => {
  const num = typeof rate === "number" && !isNaN(rate) ? rate : 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parses calendar voucher date consistently to UTC noon to prevent timezone shifts (e.g. 20th becoming 19th).
 */
export const parseVoucherDate = (dateInput: string | Date | undefined): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  const str = String(dateInput).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    // Setting to UTC noon (12:00:00Z) guarantees no timezone offset (±12h) will cross calendar day boundaries
    return new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
};
