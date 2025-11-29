/**
 * Credits Store
 * Centralized credit balance management using Zustand
 * Single Responsibility: Manage global credit state
 *
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for credits data
 * - Credits are fetched ONLY ONCE when app opens (or user logs in)
 * - All components read from this store, NOT from Firestore
 * - Updates modify store state directly (no refetch)
 * - Real-time listener updates store automatically
 * - Local cache for instant loading (no Firestore read on app open)
 *
 * Architecture:
 * - Zustand for global state (NO Context API)
 * - Local cache (AsyncStorage) for instant loading
 * - Firestore real-time listener for live updates
 * - Manual state updates after mutations (no refetch)
 */

import { create } from "zustand";
import { onSnapshot, doc } from "firebase/firestore";
import { getFirestore } from "@umituz/react-native-firestore";
import type { ICreditsRepository } from "../../domain/repositories/ICreditsRepository";

const CREDITS_CACHE_KEY = "vivoim_credits_cache";
const CREDITS_CACHE_TIMESTAMP_KEY = "vivoim_credits_cache_timestamp";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedCredits {
  credits: number;
  timestamp: number;
  userId: string;
}

interface CreditsState {
  credits: number | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isInitialized: boolean;
  listenerUnsubscribe: (() => void) | null;
  currentUserId: string | null;
}

interface CreditsActions {
  setCredits: (credits: number) => void;
  addCredits: (amount: number) => void;
  deductCredits: (amount: number) => void;
  loadCredits: (
    userId: string,
    repository: ICreditsRepository,
    useCache?: boolean,
  ) => Promise<void>;
  initialize: (
    userId: string,
    repository: ICreditsRepository,
  ) => Promise<void>;
  startRealtimeListener: (userId: string) => void;
  stopRealtimeListener: () => void;
  reset: () => void;
  
  // Cache actions
  loadFromCache: (userId: string) => Promise<number | null>;
  saveToCache: (userId: string, credits: number) => Promise<void>;
  clearCache: () => Promise<void>;
}

type CreditsStore = CreditsState & CreditsActions;

const initialState: CreditsState = {
  credits: 0,
  loading: false,
  error: null,
  lastUpdated: null,
  isInitialized: false,
  listenerUnsubscribe: null,
  currentUserId: null,
};

export const useCreditsStore = create<CreditsStore>((set, get) => ({
  ...initialState,

  /**
   * Set credits directly
   * Also updates cache
   */
  setCredits: async (credits: number) => {
    const state = get();
    set({
      credits,
      lastUpdated: Date.now(),
      error: null,
    });
    
    // Update cache
    if (state.currentUserId) {
      await state.saveToCache(state.currentUserId, credits);
    }
  },

  /**
   * Add credits to current balance
   */
  addCredits: async (amount: number) => {
    const state = get();
    const current = state.credits;
    if (current !== null) {
      const newCredits = current + amount;
      set({
        credits: newCredits,
        lastUpdated: Date.now(),
      });
      
      // Update cache
      if (state.currentUserId) {
        await state.saveToCache(state.currentUserId, newCredits);
      }
    }
  },

  /**
   * Deduct credits from current balance
   */
  deductCredits: async (amount: number) => {
    const state = get();
    const current = state.credits;
    if (current !== null) {
      const newCredits = Math.max(0, current - amount);
      set({
        credits: newCredits,
        lastUpdated: Date.now(),
      });
      
      // Update cache
      if (state.currentUserId) {
        await state.saveToCache(state.currentUserId, newCredits);
      }
    }
  },

  /**
   * Initialize credits store
   * Called once when app opens or user logs in
   * CRITICAL: Loads from cache first (instant), then syncs with Firestore
   */
  initialize: async (userId: string, repository: ICreditsRepository) => {
    const state = get();
    if (state.isInitialized && state.currentUserId === userId) {
      // Already initialized for this user
      return;
    }

    set({ loading: true, error: null, currentUserId: userId });

    try {
      // Step 1: Load from cache (instant, no Firestore read)
      const cachedCredits = await state.loadFromCache(userId);
      if (cachedCredits !== null) {
        set({ credits: cachedCredits, loading: false });
        /* eslint-disable-next-line no-console */
        if (__DEV__) {
          /* eslint-disable-next-line no-console */
          console.log("[CreditsStore] ✅ Loaded from cache (instant)");
        }
      }

      // Step 2: Load from Firestore (with Firestore cache, minimal read)
      // This will update store if Firestore has newer data
      await state.loadCredits(userId, repository, false);

      // Step 3: Start real-time listener for live updates
      state.startRealtimeListener(userId);

      set({ isInitialized: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load credits";
      set({ error: errorMessage, loading: false });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load credits from repository
   * Uses Firestore cache - no read if cached
   * CRITICAL: Saves to local cache after loading
   */
  loadCredits: async (
    userId: string,
    repository: ICreditsRepository,
    useCache: boolean = true,
  ) => {
    // Try cache first if enabled
    if (useCache) {
      const cachedCredits = await get().loadFromCache(userId);
      if (cachedCredits !== null) {
        set({ credits: cachedCredits, loading: false });
        return;
      }
    }

    if (!userId) {
      set({ credits: 0, loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });

    try {
      const balance = await repository.getBalance(userId);
      const credits = balance?.credits ?? 0;
      
      // Save to local cache for next time
      await get().saveToCache(userId, credits);
      
      set({
        credits,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load credits";
      set({
        loading: false,
        error: errorMessage,
        credits: get().credits,
      });
      throw error;
    }
  },

  /**
   * Start real-time listener for credits changes
   * CRITICAL: Only ONE listener should be active at a time
   */
  startRealtimeListener: (userId: string) => {
    const state = get();

    // Stop existing listener if any
    if (state.listenerUnsubscribe) {
      state.listenerUnsubscribe();
    }

    const db = getFirestore();
    if (!db) {
      /* eslint-disable-next-line no-console */
      if (__DEV__) {
        /* eslint-disable-next-line no-console */
        console.warn("[CreditsStore] Firestore not initialized, skipping listener");
      }
      return;
    }

    // Credits are stored in user_profiles collection
    const profileRef = doc(db, "vivoim_user_profiles", userId);

    const unsubscribe = onSnapshot(
      profileRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const credits = (data?.credits ?? 0) as number;
          set({ credits, lastUpdated: Date.now() });
          
          // Update local cache when real-time update arrives
          await get().saveToCache(userId, credits);
        } else {
          set({ credits: 0, lastUpdated: Date.now() });
          await get().clearCache();
        }
      },
      (error) => {
        /* eslint-disable-next-line no-console */
        if (__DEV__) {
          /* eslint-disable-next-line no-console */
          console.error("[CreditsStore] Listener error:", error);
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        set({ error: errorMessage });
      },
    );

    set({ listenerUnsubscribe: unsubscribe });
  },

  /**
   * Stop real-time listener
   */
  stopRealtimeListener: () => {
    const state = get();
    if (state.listenerUnsubscribe) {
      state.listenerUnsubscribe();
      set({ listenerUnsubscribe: null });
    }
  },

  /**
   * Load credits from local cache
   * Returns null if cache expired or not found
   */
  loadFromCache: async (userId: string): Promise<number | null> => {
    try {
      // Use dynamic import to avoid circular dependency
      const { storageRepository } = await import("@umituz/react-native-storage");
      
      const cacheResult = await storageRepository.getItem<CachedCredits | null>(
        CREDITS_CACHE_KEY,
        null,
      );

      if (!cacheResult.success || !cacheResult.data) {
        return null;
      }

      const cached = cacheResult.data;

      // Check if cache is for this user
      if (cached.userId !== userId) {
        return null;
      }

      // Check if cache is expired
      const now = Date.now();
      const cacheAge = now - cached.timestamp;
      if (cacheAge > CACHE_EXPIRY_MS) {
        /* eslint-disable-next-line no-console */
        if (__DEV__) {
          /* eslint-disable-next-line no-console */
          console.log("[CreditsStore] Cache expired, ignoring");
        }
        return null;
      }

      return cached.credits;
    } catch (error) {
      /* eslint-disable-next-line no-console */
      if (__DEV__) {
        /* eslint-disable-next-line no-console */
        console.warn("[CreditsStore] Cache read error:", error);
      }
      return null;
    }
  },

  /**
   * Save credits to local cache
   */
  saveToCache: async (userId: string, credits: number): Promise<void> => {
    try {
      // Use dynamic import to avoid circular dependency
      const { storageRepository } = await import("@umituz/react-native-storage");
      
      const cached: CachedCredits = {
        credits,
        timestamp: Date.now(),
        userId,
      };
      await storageRepository.setItem(CREDITS_CACHE_KEY, cached);
    } catch (error) {
      /* eslint-disable-next-line no-console */
      if (__DEV__) {
        /* eslint-disable-next-line no-console */
        console.warn("[CreditsStore] Cache write error:", error);
      }
      // Silent fail - cache is optional
    }
  },

  /**
   * Clear local cache
   */
  clearCache: async (): Promise<void> => {
    try {
      // Use dynamic import to avoid circular dependency
      const { storageRepository } = await import("@umituz/react-native-storage");
      
      await storageRepository.removeItem(CREDITS_CACHE_KEY);
      await storageRepository.removeItem(CREDITS_CACHE_TIMESTAMP_KEY);
    } catch (error) {
      /* eslint-disable-next-line no-console */
      if (__DEV__) {
        /* eslint-disable-next-line no-console */
        console.warn("[CreditsStore] Cache clear error:", error);
      }
    }
  },

  /**
   * Reset store (on logout)
   */
  reset: async () => {
    const state = get();
    state.stopRealtimeListener();
    await state.clearCache();
    set({
      ...initialState,
      credits: 0,
      isInitialized: false,
      listenerUnsubscribe: null,
      currentUserId: null,
    });
  },
}));