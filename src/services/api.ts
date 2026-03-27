/**
 * PeakHer API Service
 *
 * Centralized HTTP client that talks to the PeakHer backend at https://peakher.ai/api.
 * Handles JWT storage in SecureStore, automatic Authorization headers,
 * and token-expiry redirects.
 */

import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const BASE_URL = 'https://peakher.ai';
const TOKEN_KEY = 'peakher_jwt';

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, authenticated = true } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authenticated) {
    const token = await getToken();
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers: finalHeaders,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, config);

  // Handle 401 — token expired or invalid
  if (response.status === 401 && authenticated) {
    await clearToken();
    // Navigate to login — wrapped in try/catch because router may not be ready
    try {
      router.replace('/(auth)/login');
    } catch {
      // ignore navigation errors during startup
    }
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || `Request failed with status ${response.status}`,
      response.status,
      data,
    );
  }

  return data as T;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export interface LoginResponse {
  token: string;
  user: UserProfile;
  cycleProfile: CycleProfile | null;
  streak: StreakData | null;
}

export interface RegisterResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  personas: string[];
  onboardingComplete: boolean;
  createdAt: string;
}

export interface CycleProfile {
  trackingEnabled: boolean;
  averageCycleLength: number;
  lastPeriodStart: string | null;
}

export interface StreakData {
  current: number;
  longest: number;
  lastCheckinDate: string | null;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const data = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    authenticated: false,
  });
  await setToken(data.token);
  return data;
}

export async function register(params: {
  name: string;
  email: string;
  password: string;
  personas?: string[];
  cycleProfile?: {
    trackingEnabled: boolean;
    averageCycleLength?: number;
    lastPeriodStart?: string;
  };
}): Promise<RegisterResponse> {
  const data = await request<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: params,
    authenticated: false,
  });
  await setToken(data.token);
  return data;
}

export async function requestPasswordReset(
  email: string,
): Promise<{ success: boolean; message: string }> {
  return request('/api/auth/request-reset', {
    method: 'POST',
    body: { email },
    authenticated: false,
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ success: boolean; message: string }> {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: { token, password },
    authenticated: false,
  });
}

// ---------------------------------------------------------------------------
// User / Profile endpoints
// ---------------------------------------------------------------------------

export interface UserResponse {
  user: UserProfile;
  cycleProfile: CycleProfile | null;
  streak: StreakData | null;
  checkinCount: number;
}

export async function getProfile(): Promise<UserResponse> {
  return request<UserResponse>('/api/user');
}

export async function updateProfile(params: {
  name?: string;
  personas?: string[];
  cycleProfile?: {
    trackingEnabled: boolean;
    averageCycleLength?: number;
    lastPeriodStart?: string | null;
  };
}): Promise<{ success: boolean }> {
  return request('/api/user', { method: 'PUT', body: params });
}

// ---------------------------------------------------------------------------
// Check-in endpoints
// ---------------------------------------------------------------------------

export interface CheckinData {
  date: string;
  energy: number;
  confidence: number;
  sleepQuality?: number | null;
  stressLevel?: number | null;
  cycleDay?: number | null;
  cyclePhase?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export async function submitCheckin(checkin: {
  date: string;
  energy: number;
  confidence: number;
  sleepQuality?: number;
  stressLevel?: number;
  cycleDay?: number;
  cyclePhase?: string;
  notes?: string;
}): Promise<CheckinData> {
  return request<CheckinData>('/api/checkins', {
    method: 'POST',
    body: checkin,
  });
}

export async function getCheckins(params?: {
  start?: string;
  end?: string;
}): Promise<Record<string, CheckinData>> {
  let path = '/api/checkins';
  if (params?.start && params?.end) {
    path += `?start=${params.start}&end=${params.end}`;
  }
  return request<Record<string, CheckinData>>(path);
}

// ---------------------------------------------------------------------------
// Briefing endpoint
// ---------------------------------------------------------------------------

export interface BriefingResponse {
  phase: string;
  phaseName: string;
  phaseEmoji: string;
  cycleDay: number | null;
  cycleDayInPhase: number | null;
  phaseTotalDays: number | null;
  headline: string;
  summary: string;
  recommendations: {
    work: { title: string; tip: string; doThis: string; skipThis: string };
    fitness: { title: string; tip: string; doThis: string; skipThis: string };
    nutrition: { title: string; tip: string; doThis: string; skipThis: string };
    social: { title: string; tip: string; doThis: string; skipThis: string };
  };
  todayEnergy: string;
  energyForecast: string;
  funFact: string;
  hasCheckedInToday: boolean;
  todayCheckin: CheckinData | null;
  recentTrend: {
    avgEnergy: number;
    avgConfidence: number;
    checkinCount: number;
  } | null;
  streak: {
    current: number;
    longest: number;
  };
}

export async function getBriefing(): Promise<BriefingResponse> {
  return request<BriefingResponse>('/api/briefing');
}

// ---------------------------------------------------------------------------
// Patterns endpoint
// ---------------------------------------------------------------------------

export interface PatternsResponse {
  ready: boolean;
  checkinCount?: number;
  required?: number;
  patterns?: Array<{
    type: string;
    description: string;
    confidenceScore: number;
    dataPointsUsed: number;
    positive: boolean;
    metadata?: Record<string, unknown>;
  }>;
  summary?: {
    dataQuality: string;
    totalCheckins: number;
    dateRange: { start: string; end: string };
  };
}

export async function getPatterns(
  days?: number,
): Promise<PatternsResponse> {
  const path = days ? `/api/patterns?days=${days}` : '/api/patterns';
  return request<PatternsResponse>(path);
}

// ---------------------------------------------------------------------------
// Insights endpoint
// ---------------------------------------------------------------------------

export interface InsightsResponse {
  ready: boolean;
  cached?: boolean;
  checkinCount?: number;
  required?: number;
  patternInsights?: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    actionTip: string;
  }>;
  weekAheadNarrative?: {
    summary: string | null;
    bestDayTip: string | null;
    watchOut: string | null;
    cycleContext: string | null;
  };
  recommendations?: Array<{
    id: string;
    text: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }>;
  generatedAt?: string;
}

export async function getInsights(): Promise<InsightsResponse> {
  return request<InsightsResponse>('/api/insights');
}

// ---------------------------------------------------------------------------
// Streak endpoint
// ---------------------------------------------------------------------------

export async function getStreak(): Promise<StreakData> {
  return request<StreakData>('/api/streak');
}

// ---------------------------------------------------------------------------
// Events endpoint
// ---------------------------------------------------------------------------

export interface EventData {
  id: number;
  type: 'win' | 'challenge' | 'flow';
  title: string;
  notes: string | null;
  category: string | null;
  intensity: number | null;
  eventDate: string;
  createdAt: string;
}

export async function getEvents(params?: {
  start?: string;
  end?: string;
  type?: string;
  limit?: number;
}): Promise<{ events: EventData[] }> {
  const qp = new URLSearchParams();
  if (params?.start) qp.set('start', params.start);
  if (params?.end) qp.set('end', params.end);
  if (params?.type) qp.set('type', params.type);
  if (params?.limit) qp.set('limit', String(params.limit));
  const qs = qp.toString();
  return request(`/api/events${qs ? '?' + qs : ''}`);
}

export async function createEvent(event: {
  type: 'win' | 'challenge' | 'flow';
  title: string;
  notes?: string;
  category?: string;
  intensity?: number;
  eventDate?: string;
}): Promise<EventData> {
  return request<EventData>('/api/events', { method: 'POST', body: event });
}

export async function deleteEvent(id: number): Promise<{ success: boolean }> {
  return request(`/api/events?id=${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function registerPushToken(pushToken: string): Promise<{ success: boolean }> {
  // The web app uses web-push subscriptions with endpoint + keys.
  // For native push, we store the Expo push token as endpoint for now.
  return request('/api/notifications/subscribe', {
    method: 'POST',
    body: {
      endpoint: pushToken,
      keys: { p256dh: 'expo-push', auth: 'expo-push' },
    },
  });
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function deleteAccount(
  confirmEmail: string,
): Promise<{ success: boolean; message: string }> {
  return request('/api/account/delete', {
    method: 'POST',
    body: { confirmEmail },
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportData(): Promise<unknown> {
  return request('/api/export');
}
