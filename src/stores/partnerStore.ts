/**
 * Partner Briefing Store (Zustand)
 * Manages partner's daily briefing state.
 */

import { create } from 'zustand';
import { getPartnerBriefing, PartnerBriefingResponse } from '../services/api';

interface PartnerState {
  briefing: PartnerBriefingResponse | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetchBriefing: (force?: boolean) => Promise<void>;
  clear: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const usePartnerStore = create<PartnerState>((set, get) => ({
  briefing: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  fetchBriefing: async (force = false) => {
    const { lastFetchedAt, isLoading } = get();
    if (isLoading) return;
    if (!force && lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL) return;

    set({ isLoading: true, error: null });
    try {
      const data = await getPartnerBriefing();
      set({ briefing: data, isLoading: false, lastFetchedAt: Date.now() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load briefing';
      set({ error: msg, isLoading: false });
    }
  },

  clear: () => set({ briefing: null, isLoading: false, error: null, lastFetchedAt: null }),
}));
