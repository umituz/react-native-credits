/**
 * useCredits Hook
 * Business logic for credits management
 * Single Responsibility: Handle credits balance and checks
 * Uses centralized Zustand store for state management
 *
 * CRITICAL: This hook reads from global store, NOT from Firestore
 * Credits are fetched once when app opens (in App.tsx)
 * Updates modify store state directly (no refetch)
 * Real-time listener updates store automatically
 */

import { useCallback } from "react";
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
  error: string | null;

  /** Load credits from repository (force reload, no cache) */
  loadCredits: () => Promise<void>;

  /** Check if user has enough credits */
  checkCredits: (required: number) => boolean;
}

/**
 * Hook for credits management
 * Uses centralized store - all components share the same credit state
 * CRITICAL: Does NOT fetch on mount - store is initialized in App.tsx
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
   * CRITICAL: Force reload from Firestore (no cache)
   */
  const loadCredits = useCallback(async () => {
    if (!userId) {
      return;
    }
    await loadCreditsFromStore(userId, repository, false); // Force reload
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

  // CRITICAL: Do NOT load credits on mount
  // Store is initialized in App.tsx when user logs in
  // This prevents every component from triggering a Firestore read

  return {
    credits,
    loading,
    error,
    loadCredits,
    checkCredits,
  };
}
