/**
 * Financial and tax configuration for MLF Platform.
 */
export const FINANCIAL_CONFIG = {
  /** Default GST percentage applied when GST is enabled */
  DEFAULT_GST_PERCENT: 18,

  /** Available standard GST percentage slabs in India */
  AVAILABLE_GST_PERCENTS: [0, 5, 12, 18, 28] as const,
} as const;
