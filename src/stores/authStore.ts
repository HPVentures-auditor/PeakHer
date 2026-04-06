/**
 * Auth & User State — Zustand store
 */

import { create } from 'zustand';
import * as api from '../services/api';

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: api.UserProfile | null;
  cycleProfile: api.CycleProfile | null;
  streak: api.StreakData | null;
  checkinCount: number;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    name: string;
    email: string;
    password: string;
    personas?: string[];
    cycleProfile?: {
      trackingEnabled: boolean;
      averageCycleLength?: number;
      lastPeriodStart?: string;
    };
  }) => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (params: {
    name?: string;
    personas?: string[];
    coachVoice?: string;
    cycleProfile?: {
      trackingEnabled: boolean;
      averageCycleLength?: number;
      lastPeriodStart?: string | null;
    };
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  setStreak: (streak: api.StreakData) => void;
  setCheckinCount: (count: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  cycleProfile: null,
  streak: null,
  checkinCount: 0,

  login: async (email, password) => {
    const data = await api.login(email, password);
    set({
      isAuthenticated: true,
      user: data.user,
      cycleProfile: data.cycleProfile,
      streak: data.streak,
    });
  },

  register: async (params) => {
    const data = await api.register(params);
    set({
      isAuthenticated: true,
      user: data.user,
      cycleProfile: null,
      streak: null,
    });
  },

  loadProfile: async () => {
    try {
      const data = await api.getProfile();
      set({
        user: data.user,
        cycleProfile: data.cycleProfile,
        streak: data.streak,
        checkinCount: data.checkinCount,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (params) => {
    await api.updateProfile(params);
    // Refresh profile data
    await get().loadProfile();
  },

  logout: async () => {
    await api.clearToken();
    set({
      isAuthenticated: false,
      user: null,
      cycleProfile: null,
      streak: null,
      checkinCount: 0,
    });
  },

  checkAuth: async () => {
    const token = await api.getToken();
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
    try {
      await get().loadProfile();
      return true;
    } catch {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  setStreak: (streak) => set({ streak }),
  setCheckinCount: (count) => set({ checkinCount: count }),
}));
