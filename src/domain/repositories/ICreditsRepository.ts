/**
 * Credits Repository Interface
 * Port for database operations
 *
 * SECURITY: Apps must implement this interface with their database.
 * Never expose database credentials or allow direct database access.
 */

import type { CreditsBalance } from "../entities/CreditsBalance";
import type { CreditLog } from "../entities/CreditLog";

export interface ICreditsRepository {
  /**
   * Get user's credit balance
   * Returns null if user not found
   */
  getBalance(userId: string): Promise<CreditsBalance | null>;

  /**
   * Update user's credit balance
   * Should use atomic transactions
   */
  updateBalance(
    userId: string,
    newBalance: number,
  ): Promise<CreditsBalance>;

  /**
   * Add credits to user's balance
   * Should use atomic transactions
   */
  addCredits(
    userId: string,
    amount: number,
  ): Promise<CreditsBalance>;

  /**
   * Deduct credits from user's balance
   * Should use atomic transactions
   * Throws error if insufficient credits
   */
  deductCredits(
    userId: string,
    amount: number,
  ): Promise<CreditsBalance>;

  /**
   * Log credit transaction
   */
  logTransaction(log: CreditLog): Promise<void>;
}

