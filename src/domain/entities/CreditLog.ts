/**
 * Credit Log Entity
 * Represents a credit transaction log entry
 */

export type CreditLogReason =
  | "usage"
  | "purchase"
  | "refund"
  | "bonus"
  | "subscription"
  | "admin"
  | "other";

export interface CreditLog {
  /** Unique log ID */
  id: string;

  /** User ID */
  userId: string;

  /** Credit amount (positive for additions, negative for deductions) */
  amount: number;

  /** Reason for credit change */
  reason: CreditLogReason;

  /** Optional description */
  description?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;

  /** Timestamp (ISO string or Unix timestamp) */
  timestamp: string | number;

  /** Optional reference ID (e.g., transaction ID, order ID) */
  referenceId?: string;
}

/**
 * Create a credit log entry
 */
export function createCreditLog(
  userId: string,
  amount: number,
  reason: CreditLogReason,
  options?: {
    description?: string;
    metadata?: Record<string, unknown>;
    referenceId?: string;
  },
): CreditLog {
  return {
    id: `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId,
    amount,
    reason,
    description: options?.description,
    metadata: options?.metadata,
    timestamp: new Date().toISOString(),
    referenceId: options?.referenceId,
  };
}

