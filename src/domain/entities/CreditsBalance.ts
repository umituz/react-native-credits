/**
 * Credits Balance Entity
 * Represents user's credit balance
 */

export interface CreditsBalance {
  /** User ID */
  userId: string;

  /** Current credit balance */
  credits: number;

  /** Last updated timestamp */
  lastUpdated: string | number;
}

/**
 * Create default credits balance
 */
export function createDefaultCreditsBalance(userId: string): CreditsBalance {
  return {
    userId,
    credits: 0,
    lastUpdated: new Date().toISOString(),
  };
}

