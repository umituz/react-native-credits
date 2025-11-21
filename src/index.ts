/**
 * @umituz/react-native-credits - Public API
 *
 * Credits management system for React Native apps
 * Database-first approach with secure validation
 *
 * Usage:
 *   import { useCredits, useCreditsStore, ICreditsRepository } from '@umituz/react-native-credits';
 */

// =============================================================================
// DOMAIN LAYER - Entities
// =============================================================================

export {
  createCreditLog,
  type CreditLog,
  type CreditLogReason,
} from "./domain/entities/CreditLog";

export {
  createDefaultCreditsBalance,
  type CreditsBalance,
} from "./domain/entities/CreditsBalance";

// =============================================================================
// DOMAIN LAYER - Repository Interface
// =============================================================================

export type { ICreditsRepository } from "./domain/repositories/ICreditsRepository";

// =============================================================================
// INFRASTRUCTURE LAYER - Storage
// =============================================================================

export { useCreditsStore } from "./infrastructure/storage/CreditsStore";

// =============================================================================
// PRESENTATION LAYER - Hooks
// =============================================================================

export {
  useCredits,
  type UseCreditsParams,
  type UseCreditsReturn,
} from "./presentation/hooks/useCredits";

