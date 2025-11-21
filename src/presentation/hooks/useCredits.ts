/**
 * useCredits Hook
 * Business logic for credits management
 * Single Responsibility: Handle credits balance and checks
 * Uses centralized Zustand store for state management
 */

import { useEffect, useCallback } from "react";
import { useCreditsStore } from "../../infrastructure/storage/CreditsStore";
import type { ICreditsRepository } from "../../domain/repositories/ICreditsRepository";

export interface UseCreditsParams {
  /** User ID */
  userId: string | null;

  /** Credits repository */
  repository: ICreditsRepository;
}

export interface UseCreditsReturn {
  /** Current credit balance */
  credits: number | null;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: Error | null;

  /** Load credits from repository */
  loadCredits: () => Promise<void>;

  /** Check if user has enough credits */
  checkCredits: (required: number) => boolean;
}

/**
 * Hook for credits management
 * Uses centralized store - all components share the same credit state
 */
export function useCredits(params: UseCreditsParams): UseCreditsReturn {
  const { userId, repository } = params;

  const credits = useCreditsStore((state) => state.credits);
  const loading = useCreditsStore((state) => state.loading);
  const error = useCreditsStore((state) => state.error);
  const loadCreditsFromStore = useCreditsStore((state) => state.loadCredits);

  /**
   * Load credits balance from repository
   * Uses centralized store
   */
  const loadCredits = useCallback(async () => {
    if (!userId) {
      return;
    }
    await loadCreditsFromStore(userId, repository);
  }, [userId, repository, loadCreditsFromStore]);

  /**
   * Check if user has enough credits
   */
  const checkCredits = useCallback(
    (required: number): boolean => {
      return credits !== null && credits >= required;
    },
    [credits],
  );

  // Load credits on mount and when userId changes
  useEffect(() => {
    if (userId) {
      loadCredits();
    } else {
      // Reset store when user logs out
      useCreditsStore.getState().reset();
    }
  }, [userId, loadCredits]);

  return {
    credits,
    loading,
    error,
    loadCredits,
    checkCredits,
  };
}

