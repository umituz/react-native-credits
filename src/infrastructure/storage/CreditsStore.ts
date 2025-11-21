/**
 * Credits Store
 * Centralized credit balance management using Zustand
 * Single Responsibility: Manage global credit state
 */

import { create } from "zustand";
import type { ICreditsRepository } from "../../domain/repositories/ICreditsRepository";

interface CreditsState {
  credits: number | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

interface CreditsActions {
  setCredits: (credits: number) => void;
  addCredits: (amount: number) => void;
  deductCredits: (amount: number) => void;
  loadCredits: (
    userId: string,
    repository: ICreditsRepository,
  ) => Promise<void>;
  reset: () => void;
}

type CreditsStore = CreditsState & CreditsActions;

const initialState: CreditsState = {
  credits: 0,
  loading: false,
  error: null,
  lastUpdated: null,
};

export const useCreditsStore = create<CreditsStore>((set, get) => ({
  ...initialState,

  /**
   * Set credits directly
   */
  setCredits: (credits: number) => {
    set({
      credits,
      lastUpdated: Date.now(),
      error: null,
    });
  },

  /**
   * Add credits to current balance
   */
  addCredits: (amount: number) => {
    const current = get().credits;
    if (current !== null) {
      set({
        credits: current + amount,
        lastUpdated: Date.now(),
      });
    }
  },

  /**
   * Deduct credits from current balance
   */
  deductCredits: (amount: number) => {
    const current = get().credits;
    if (current !== null) {
      set({
        credits: Math.max(0, current - amount),
        lastUpdated: Date.now(),
      });
    }
  },

  /**
   * Load credits from repository
   */
  loadCredits: async (userId: string, repository: ICreditsRepository) => {
    if (!userId) {
      set({ credits: 0, loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });

    try {
      const balance = await repository.getBalance(userId);
      set({
        credits: balance?.credits ?? 0,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error ? error : new Error("Failed to load credits"),
        credits: get().credits,
      });
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      ...initialState,
      credits: 0,
    });
  },
}));

