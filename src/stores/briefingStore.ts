/**
 * Briefing State — Zustand store
 * Caches today's briefing so it doesn't refetch on every tab switch.
 */

import { create } from 'zustand';
import * as api from '../services/api';

interface BriefingState {
  briefing: api.BriefingResponse | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  fetchBriefing: (force?: boolean) => Promise<void>;
  clear: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useBriefingStore = create<BriefingState>((set, get) => ({
  briefing: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  fetchBriefing: async (force = false) => {
    const state = get();
    // Return cached if fresh
    if (
      !force &&
      state.briefing &&
      state.lastFetchedAt &&
      Date.now() - state.lastFetchedAt < CACHE_TTL
    ) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await api.getBriefing();
      set({ briefing: data, isLoading: false, lastFetchedAt: Date.now() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load briefing';
      set({ error: msg, isLoading: false });
    }
  },

  clear: () => set({ briefing: null, lastFetchedAt: null }),
}));
