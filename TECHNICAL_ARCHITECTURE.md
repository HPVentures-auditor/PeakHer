# Many Hats / PeakHer -- Technical Architecture Document

**Version:** 1.0
**Date:** 2026-03-11
**Status:** Draft
**Audience:** Engineering team, technical co-founders, senior developers

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Detailed Data Model](#2-detailed-data-model)
3. [API Endpoints](#3-api-endpoints)
4. [AI/ML Pipeline Architecture](#4-aiml-pipeline-architecture)
5. [Integration Architecture](#5-integration-architecture)
6. [Security & Privacy Architecture](#6-security--privacy-architecture)
7. [Infrastructure](#7-infrastructure)

---

## 1. System Architecture Overview

### 1.1 Mission Statement

PeakHer is a personal performance intelligence platform for women. It correlates self-reported daily data (energy, confidence, stress, sleep) with passive data streams (calendar, CRM, fitness trackers) and menstrual cycle phases to detect individualized performance patterns and predict peak performance windows. The core value proposition: know when your best days are coming and plan accordingly.

### 1.2 High-Level Architecture

```
+-------------------------------------------------------------------+
|                        CLIENT LAYER                                |
|                                                                    |
|   +----------------------------+  +----------------------------+   |
|   |   React Native Mobile App  |  |   Web Dashboard (Future)   |   |
|   |   (iOS primary, Android)   |  |   (React / Next.js)        |   |
|   +-------------+--------------+  +-------------+--------------+   |
|                 |                                |                  |
+-------------------------------------------------------------------+
                  |                                |
                  v                                v
+-------------------------------------------------------------------+
|                        API GATEWAY                                 |
|                                                                    |
|   +------------------------------------------------------------+   |
|   |              FastAPI (Python 3.12+)                         |   |
|   |                                                            |   |
|   |  +----------+ +----------+ +----------+ +-----------+      |   |
|   |  |   Auth   | |  Check-  | |  Events  | | Insights  |      |   |
|   |  |  Router  | |   ins    | |  Router  | |  Router   |      |   |
|   |  +----------+ +----------+ +----------+ +-----------+      |   |
|   |                                                            |   |
|   |  +----------+ +----------+ +----------+ +-----------+      |   |
|   |  |  Cycle   | | Patterns | | Integr.  | |  Users    |      |   |
|   |  |  Router  | |  Router  | |  Router  | |  Router   |      |   |
|   |  +----------+ +----------+ +----------+ +-----------+      |   |
|   +------------------------------------------------------------+   |
|                                                                    |
+-------------------------------------------------------------------+
          |              |              |              |
          v              v              v              v
+-------------------------------------------------------------------+
|                      SERVICE LAYER                                 |
|                                                                    |
|  +--------------+  +---------------+  +-------------------------+  |
|  | Auth Service |  | Data Ingestion|  | Pattern Detection       |  |
|  | (JWT + PKCE) |  | Service       |  | Service                 |  |
|  +--------------+  +---------------+  +-------------------------+  |
|                                                                    |
|  +--------------+  +---------------+  +-------------------------+  |
|  | Notification |  | Integration   |  | Prediction              |  |
|  | Service      |  | Sync Service  |  | Engine                  |  |
|  | (APNs/FCM)   |  | (Celery)      |  | (ML Pipeline)           |  |
|  +--------------+  +---------------+  +-------------------------+  |
|                                                                    |
|  +--------------+  +---------------+                               |
|  | Insight      |  | Export        |                               |
|  | Generator    |  | Service       |                               |
|  +--------------+  +---------------+                               |
|                                                                    |
+-------------------------------------------------------------------+
          |              |              |              |
          v              v              v              v
+-------------------------------------------------------------------+
|                      DATA LAYER                                    |
|                                                                    |
|  +---------------------+  +--------------------+  +------------+   |
|  | PostgreSQL 16        |  | Redis              |  | S3 / R2    |   |
|  | (Primary DB)         |  | (Cache + Queues)   |  | (Exports,  |   |
|  |                      |  |                    |  |  Backups)   |   |
|  | - Core tables        |  | - Session cache    |  +------------+   |
|  | - TimescaleDB ext.   |  | - Rate limiting    |                   |
|  |   for time-series    |  | - Celery broker    |                   |
|  | - pgcrypto for       |  | - Real-time pub/   |                   |
|  |   field encryption   |  |   sub              |                   |
|  +---------------------+  +--------------------+                   |
|                                                                    |
+-------------------------------------------------------------------+
          |
          v
+-------------------------------------------------------------------+
|                  EXTERNAL INTEGRATIONS                              |
|                                                                    |
|  +----------+ +----------+ +----------+ +----------+ +----------+  |
|  | Google   | | Apple    | | HubSpot  | | Apple    | | Oura     |  |
|  | Calendar | | Calendar | |          | | Health   | |          |  |
|  +----------+ +----------+ +----------+ +----------+ +----------+  |
|  +----------+ +----------+ +----------+ +----------+               |
|  | Salesforce| | Garmin  | |  Whoop   | | Strava   |              |
|  +----------+ +----------+ +----------+ +----------+               |
|                                                                    |
+-------------------------------------------------------------------+
```

### 1.3 Technology Choices and Rationale

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Mobile Client | React Native (Expo) | Cross-platform from day one. Expo simplifies Apple Health and push notification integration. |
| API | FastAPI (Python) | Python ecosystem is essential for the ML pipeline. FastAPI gives us async performance, auto-generated OpenAPI docs, and Pydantic validation. Keeps API and ML in one language. |
| Primary DB | PostgreSQL 16 + TimescaleDB | Battle-tested relational DB. TimescaleDB extension gives us time-series superpowers (compression, continuous aggregates) without a separate database. |
| Cache/Queue | Redis | Session caching, Celery task broker, rate limiting. Single dependency for multiple concerns. |
| Task Queue | Celery | Async integration syncs, ML pipeline jobs, scheduled briefing generation. |
| ML Runtime | scikit-learn -> PyTorch | Start with classical stats (scikit-learn, statsmodels). Graduate to PyTorch only when data volume justifies it. |
| Object Storage | S3 or Cloudflare R2 | Data exports, encrypted backups. R2 preferred for cost at early stage. |
| Push Notifications | Firebase Cloud Messaging + APNs | FCM for Android, APNs for iOS. Expo handles the abstraction. |
| Auth | Supabase Auth or custom JWT | Supabase Auth if using Supabase hosting. Otherwise, custom JWT with PKCE for mobile. |

### 1.4 Request Flow (Typical Daily Check-in)

```
1. User opens app, taps "Check In"
2. React Native -> POST /api/v1/checkins (JWT in Authorization header)
3. FastAPI validates JWT, validates payload via Pydantic
4. Service layer writes to daily_checkins table
5. Celery task dispatched: run_pattern_detection(user_id, checkin_id)
6. Response returned to client (< 200ms target)
7. [Background] Pattern detection runs:
   a. Pulls last 90 days of checkin + event + cycle data
   b. Runs correlation analysis
   c. Updates patterns table if new pattern detected or existing pattern strengthened
   d. Checks if new insight should be generated
   e. If prediction accuracy can be scored (comparing today's actual vs yesterday's prediction), updates predictions table
8. [Background] If new insight generated, push notification dispatched
```

---

## 2. Detailed Data Model

### 2.1 Schema Conventions

- All tables use `BIGINT` auto-incrementing primary keys (future-proof for high-volume time-series)
- All timestamps stored as `TIMESTAMPTZ` (timezone-aware)
- All `created_at` / `updated_at` fields have server-side defaults
- Soft deletes are NOT used (see Security section -- hard delete policy)
- JSONB used sparingly and only for truly flexible/dynamic data
- Field-level encryption applied to health-sensitive columns via `pgcrypto`
- Foreign keys enforced with `ON DELETE CASCADE` where ownership is clear

### 2.2 Enums

```sql
-- Create custom enum types first
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'founding_member');
CREATE TYPE persona_type AS ENUM ('sales', 'athlete', 'entrepreneur', 'mom', 'executive', 'creative');
CREATE TYPE cycle_regularity AS ENUM ('regular', 'irregular', 'not_tracking');
CREATE TYPE event_type AS ENUM ('win', 'challenge', 'flow_state', 'custom');
CREATE TYPE event_category AS ENUM ('sales', 'fitness', 'parenting', 'business', 'leadership', 'creative', 'personal');
CREATE TYPE event_source AS ENUM ('manual', 'calendar', 'crm', 'fitness_tracker');
CREATE TYPE cycle_phase AS ENUM ('menstrual', 'follicular', 'ovulatory', 'luteal');
CREATE TYPE pattern_type AS ENUM ('energy_cycle', 'confidence_cycle', 'performance_peak', 'performance_dip', 'cross_domain');
CREATE TYPE insight_type AS ENUM ('observation', 'prediction', 'recommendation', 'anomaly');
CREATE TYPE integration_type AS ENUM (
    'google_calendar', 'apple_calendar',
    'hubspot', 'salesforce',
    'apple_health', 'garmin', 'whoop', 'oura', 'strava'
);
CREATE TYPE integration_status AS ENUM ('active', 'paused', 'error', 'disconnected');
CREATE TYPE briefing_day AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE app_theme AS ENUM ('light', 'dark', 'system');
```

### 2.3 Core Tables

#### users

```sql
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_created_at ON users (created_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### user_personas

```sql
CREATE TABLE user_personas (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    persona_type    persona_type NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, persona_type)
);

CREATE INDEX idx_user_personas_user_id ON user_personas (user_id);
CREATE INDEX idx_user_personas_active ON user_personas (user_id, is_active) WHERE is_active = TRUE;
```

#### user_preferences

```sql
CREATE TABLE user_preferences (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    checkin_reminder_time   TIME DEFAULT '09:00:00',
    weekly_briefing_day     briefing_day NOT NULL DEFAULT 'sunday',
    theme                   app_theme NOT NULL DEFAULT 'system',
    notifications_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### cycle_profiles

```sql
CREATE TABLE cycle_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tracking_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    average_cycle_length SMALLINT CHECK (average_cycle_length BETWEEN 15 AND 60),
    last_period_start   DATE,
    uses_hormonal_bc    BOOLEAN DEFAULT FALSE,
    cycle_regularity    cycle_regularity NOT NULL DEFAULT 'not_tracking',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_cycle_profiles_updated_at
    BEFORE UPDATE ON cycle_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.4 Daily Data Tables

#### daily_checkins

```sql
CREATE TABLE daily_checkins (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date                DATE NOT NULL,
    energy_level        SMALLINT NOT NULL CHECK (energy_level BETWEEN 1 AND 10),
    confidence_level    SMALLINT NOT NULL CHECK (confidence_level BETWEEN 1 AND 10),
    sleep_quality       SMALLINT CHECK (sleep_quality BETWEEN 1 AND 10),
    stress_level        SMALLINT CHECK (stress_level BETWEEN 1 AND 10),
    cycle_day           SMALLINT CHECK (cycle_day BETWEEN 1 AND 60),
    overall_day_rating  SMALLINT CHECK (overall_day_rating BETWEEN 1 AND 10),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, date)
);

-- Primary query pattern: user's checkins over a date range
CREATE INDEX idx_daily_checkins_user_date ON daily_checkins (user_id, date DESC);

-- For pattern detection: query by cycle_day across users (anonymized analytics only)
CREATE INDEX idx_daily_checkins_cycle_day ON daily_checkins (cycle_day)
    WHERE cycle_day IS NOT NULL;

-- TimescaleDB hypertable conversion (optional, beneficial at scale)
-- SELECT create_hypertable('daily_checkins', 'date', migrate_data => true);
```

#### events

```sql
CREATE TABLE events (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp       TIMESTAMPTZ NOT NULL,
    event_type      event_type NOT NULL,
    category        event_category NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    outcome_rating  SMALLINT CHECK (outcome_rating BETWEEN 1 AND 5),
    metadata        JSONB DEFAULT '{}'::JSONB,
    source          event_source NOT NULL DEFAULT 'manual',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user_timestamp ON events (user_id, timestamp DESC);
CREATE INDEX idx_events_user_category ON events (user_id, category);
CREATE INDEX idx_events_user_type ON events (user_id, event_type);
CREATE INDEX idx_events_source ON events (source);
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
```

### 2.5 Cycle Data Tables

#### cycle_entries

```sql
CREATE TABLE cycle_entries (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cycle_start_date    DATE NOT NULL,
    cycle_end_date      DATE,
    cycle_length        SMALLINT GENERATED ALWAYS AS (
                            CASE WHEN cycle_end_date IS NOT NULL
                                 THEN (cycle_end_date - cycle_start_date)
                                 ELSE NULL
                            END
                        ) STORED,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, cycle_start_date),
    CHECK (cycle_end_date IS NULL OR cycle_end_date > cycle_start_date)
);

CREATE INDEX idx_cycle_entries_user_date ON cycle_entries (user_id, cycle_start_date DESC);
```

#### predicted_phases

```sql
CREATE TABLE predicted_phases (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date                DATE NOT NULL,
    predicted_phase     cycle_phase NOT NULL,
    confidence_score    NUMERIC(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    based_on_cycles     SMALLINT NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, date)
);

CREATE INDEX idx_predicted_phases_user_date ON predicted_phases (user_id, date);
CREATE INDEX idx_predicted_phases_user_phase ON predicted_phases (user_id, predicted_phase);
```

### 2.6 Intelligence Layer Tables

#### patterns

```sql
CREATE TABLE patterns (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_type        pattern_type NOT NULL,
    description         TEXT NOT NULL,
    confidence_score    NUMERIC(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    data_points_used    INT NOT NULL DEFAULT 0,
    first_detected      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    -- A user shouldn't have duplicate active patterns of the same type+description
    -- (description differentiates, e.g., "energy peaks on cycle day 12" vs "energy peaks on Mondays")
    UNIQUE (user_id, pattern_type, description) WHERE (is_active = TRUE)
);

CREATE INDEX idx_patterns_user_active ON patterns (user_id) WHERE is_active = TRUE;
CREATE INDEX idx_patterns_user_type ON patterns (user_id, pattern_type);
CREATE INDEX idx_patterns_last_updated ON patterns (last_updated);
```

**Note:** The partial unique index above uses a `WHERE` clause. If your PostgreSQL version does not support `UNIQUE ... WHERE`, enforce this constraint at the application layer or use a partial unique index instead:

```sql
CREATE UNIQUE INDEX idx_patterns_unique_active
    ON patterns (user_id, pattern_type, description)
    WHERE is_active = TRUE;
```

#### pattern_data_points

```sql
CREATE TABLE pattern_data_points (
    id              BIGSERIAL PRIMARY KEY,
    pattern_id      BIGINT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    checkin_id      BIGINT REFERENCES daily_checkins(id) ON DELETE SET NULL,
    event_id        BIGINT REFERENCES events(id) ON DELETE SET NULL,
    value           NUMERIC(6,2) NOT NULL,
    cycle_day       SMALLINT CHECK (cycle_day BETWEEN 1 AND 60),

    -- At least one foreign key must be set
    CHECK (checkin_id IS NOT NULL OR event_id IS NOT NULL)
);

CREATE INDEX idx_pattern_data_points_pattern ON pattern_data_points (pattern_id);
CREATE INDEX idx_pattern_data_points_checkin ON pattern_data_points (checkin_id)
    WHERE checkin_id IS NOT NULL;
CREATE INDEX idx_pattern_data_points_event ON pattern_data_points (event_id)
    WHERE event_id IS NOT NULL;
```

#### insights

```sql
CREATE TABLE insights (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    content             TEXT NOT NULL,
    category            event_category NOT NULL,
    insight_type        insight_type NOT NULL,
    relevance_score     NUMERIC(3,2) NOT NULL CHECK (relevance_score BETWEEN 0 AND 1),
    was_shown           BOOLEAN NOT NULL DEFAULT FALSE,
    was_helpful         BOOLEAN,  -- NULL = not yet rated, TRUE = helpful, FALSE = not helpful
    expires_at          TIMESTAMPTZ,
    pattern_id          BIGINT REFERENCES patterns(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insights_user_date ON insights (user_id, generated_date DESC);
CREATE INDEX idx_insights_user_unshown ON insights (user_id, relevance_score DESC)
    WHERE was_shown = FALSE AND (expires_at IS NULL OR expires_at > NOW());
CREATE INDEX idx_insights_feedback ON insights (user_id, was_helpful)
    WHERE was_helpful IS NOT NULL;
```

#### predictions

```sql
CREATE TABLE predictions (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_date         DATE NOT NULL,
    predicted_energy        SMALLINT NOT NULL CHECK (predicted_energy BETWEEN 1 AND 10),
    predicted_confidence    SMALLINT NOT NULL CHECK (predicted_confidence BETWEEN 1 AND 10),
    recommended_activities  JSONB DEFAULT '[]'::JSONB,
    prediction_confidence   NUMERIC(3,2) NOT NULL CHECK (prediction_confidence BETWEEN 0 AND 1),
    actual_energy           SMALLINT CHECK (actual_energy BETWEEN 1 AND 10),
    actual_confidence       SMALLINT CHECK (actual_confidence BETWEEN 1 AND 10),
    accuracy_score          NUMERIC(3,2) GENERATED ALWAYS AS (
                                CASE WHEN actual_energy IS NOT NULL AND actual_confidence IS NOT NULL
                                     THEN 1.0 - (
                                         (ABS(predicted_energy - actual_energy) +
                                          ABS(predicted_confidence - actual_confidence))::NUMERIC / 18.0
                                     )
                                     ELSE NULL
                                END
                            ) STORED,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, prediction_date)
);

CREATE INDEX idx_predictions_user_date ON predictions (user_id, prediction_date DESC);
CREATE INDEX idx_predictions_accuracy ON predictions (user_id, accuracy_score)
    WHERE accuracy_score IS NOT NULL;
```

**`recommended_activities` JSONB structure:**

```json
[
    {
        "activity": "Schedule your most important sales call",
        "category": "sales",
        "reason": "Your energy and confidence both peak on cycle day 12 historically",
        "priority": 1
    },
    {
        "activity": "30-minute high-intensity workout",
        "category": "fitness",
        "reason": "Follicular phase -- your body recovers fastest this week",
        "priority": 2
    }
]
```

### 2.7 Integration Tables

#### integrations

```sql
CREATE TABLE integrations (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_type        integration_type NOT NULL,
    status                  integration_status NOT NULL DEFAULT 'active',
    last_synced             TIMESTAMPTZ,
    credentials_encrypted   BYTEA,  -- AES-256 encrypted OAuth tokens
    refresh_token_encrypted BYTEA,  -- Separate encrypted refresh token
    token_expires_at        TIMESTAMPTZ,
    error_message           TEXT,
    error_count             SMALLINT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, integration_type)
);

CREATE INDEX idx_integrations_user ON integrations (user_id);
CREATE INDEX idx_integrations_status ON integrations (status)
    WHERE status = 'active';
CREATE INDEX idx_integrations_needs_sync ON integrations (last_synced)
    WHERE status = 'active';

CREATE TRIGGER trigger_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### integration_events

```sql
CREATE TABLE integration_events (
    id                  BIGSERIAL PRIMARY KEY,
    integration_id      BIGINT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_id         VARCHAR(500) NOT NULL,
    raw_data            BYTEA NOT NULL,  -- Encrypted JSONB (encrypted at application layer before storage)
    mapped_event_id     BIGINT REFERENCES events(id) ON DELETE SET NULL,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (integration_id, external_id)
);

CREATE INDEX idx_integration_events_integration ON integration_events (integration_id);
CREATE INDEX idx_integration_events_user ON integration_events (user_id);
CREATE INDEX idx_integration_events_mapped ON integration_events (mapped_event_id)
    WHERE mapped_event_id IS NOT NULL;
CREATE INDEX idx_integration_events_synced ON integration_events (synced_at DESC);
```

### 2.8 Weekly Briefings Table

#### weekly_briefings

```sql
CREATE TABLE weekly_briefings (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date     DATE NOT NULL,
    content             JSONB NOT NULL,
    predictions         JSONB NOT NULL,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    was_viewed          BOOLEAN NOT NULL DEFAULT FALSE,
    viewed_at           TIMESTAMPTZ,

    UNIQUE (user_id, week_start_date)
);

CREATE INDEX idx_weekly_briefings_user_week ON weekly_briefings (user_id, week_start_date DESC);
```

**`content` JSONB structure:**

```json
{
    "summary": "Last week you logged 5 out of 7 days. Your energy averaged 7.2, up from 6.5 the week before.",
    "highlights": [
        {
            "type": "win",
            "text": "You closed 2 deals on Wednesday -- your highest-performing day this month.",
            "category": "sales"
        }
    ],
    "pattern_updates": [
        {
            "pattern_id": 42,
            "description": "Your confidence consistently peaks on cycle days 10-14.",
            "confidence": 0.82,
            "is_new": false
        }
    ],
    "week_score": {
        "energy_avg": 7.2,
        "confidence_avg": 6.8,
        "checkin_completion": 0.71,
        "events_logged": 8
    }
}
```

**`predictions` JSONB structure:**

```json
{
    "days": [
        {
            "date": "2026-03-16",
            "predicted_energy": 8,
            "predicted_confidence": 7,
            "cycle_phase": "follicular",
            "cycle_day": 10,
            "top_recommendation": "Schedule high-stakes meetings today"
        }
    ],
    "best_day": "2026-03-18",
    "lowest_day": "2026-03-21",
    "overall_outlook": "Strong week ahead. Your follicular phase aligns with a lighter calendar -- ideal for tackling ambitious goals."
}
```

### 2.9 Entity Relationship Summary

```
users (1) ---> (N) user_personas
users (1) ---> (1) user_preferences
users (1) ---> (1) cycle_profiles
users (1) ---> (N) daily_checkins
users (1) ---> (N) events
users (1) ---> (N) cycle_entries
users (1) ---> (N) predicted_phases
users (1) ---> (N) patterns
users (1) ---> (N) insights
users (1) ---> (N) predictions
users (1) ---> (N) integrations
users (1) ---> (N) integration_events
users (1) ---> (N) weekly_briefings

patterns (1) ---> (N) pattern_data_points
patterns (1) ---> (N) insights (optional FK)

pattern_data_points ---> daily_checkins (optional FK)
pattern_data_points ---> events (optional FK)

integrations (1) ---> (N) integration_events
integration_events ---> events (optional FK, mapped event)
```

### 2.10 Database Extensions Required

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- Field-level encryption
CREATE EXTENSION IF NOT EXISTS timescaledb;    -- Time-series optimization (optional, for scale)
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- Text search on notes/descriptions
```

---

## 3. API Endpoints

### 3.1 API Conventions

- **Base URL:** `/api/v1`
- **Auth:** Bearer JWT in `Authorization` header for all endpoints except auth routes
- **Content-Type:** `application/json`
- **Pagination:** Cursor-based for feeds (insights, events). Offset-based for bounded lists.
- **Date format:** ISO 8601 (`2026-03-11`, `2026-03-11T09:30:00Z`)
- **Error format:**

```json
{
    "error": {
        "code": "CHECKIN_ALREADY_EXISTS",
        "message": "A check-in already exists for 2026-03-11. Use PUT to update.",
        "details": {}
    }
}
```

- **Rate limiting:** 100 requests/minute per user (auth endpoints: 10/minute)

### 3.2 Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Create account (email, password, name, timezone) |
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/verify-email` | Verify email with token |
| DELETE | `/auth/account` | Hard delete account and all data (requires password confirmation) |

**POST /auth/signup**

```
Request:
{
    "email": "user@example.com",
    "password": "...",          // min 12 chars, complexity requirements
    "name": "Sarah",
    "timezone": "America/New_York"
}

Response (201):
{
    "user": {
        "id": 1,
        "email": "user@example.com",
        "name": "Sarah",
        "timezone": "America/New_York",
        "onboarding_completed": false
    },
    "tokens": {
        "access_token": "eyJ...",
        "refresh_token": "eyJ...",
        "expires_in": 900
    }
}
```

**DELETE /auth/account**

```
Request:
{
    "password": "...",
    "confirmation": "DELETE MY ACCOUNT"
}

Response (200):
{
    "message": "Account and all associated data permanently deleted.",
    "deleted_at": "2026-03-11T15:30:00Z"
}
```

### 3.3 Daily Check-ins

| Method | Path | Description |
|--------|------|-------------|
| POST | `/checkins` | Create today's check-in |
| PUT | `/checkins/{date}` | Update a check-in (same day only, or within 24h) |
| GET | `/checkins` | Get check-ins for date range |
| GET | `/checkins/{date}` | Get single check-in |
| GET | `/checkins/streak` | Get current check-in streak |

**POST /checkins**

```
Request:
{
    "date": "2026-03-11",               // optional, defaults to today in user's timezone
    "energy_level": 7,                   // required, 1-10
    "confidence_level": 8,               // required, 1-10
    "sleep_quality": 6,                  // optional, 1-10
    "stress_level": 4,                   // optional, 1-10
    "cycle_day": 12,                     // optional, 1-60
    "overall_day_rating": null,          // optional, typically filled at end of day
    "notes": "Big presentation today"    // optional
}

Response (201):
{
    "checkin": { ... },
    "streak": 14,
    "instant_insight": "Your energy is 2 points above your average for cycle day 12. Strong day ahead."
}
```

**GET /checkins?start_date=2026-02-01&end_date=2026-03-11**

```
Response (200):
{
    "checkins": [ ... ],
    "summary": {
        "total_days": 39,
        "days_logged": 32,
        "completion_rate": 0.82,
        "avg_energy": 6.4,
        "avg_confidence": 6.9
    }
}
```

### 3.4 Events

| Method | Path | Description |
|--------|------|-------------|
| POST | `/events` | Log an event |
| GET | `/events` | List events (filterable) |
| GET | `/events/{id}` | Get single event |
| PUT | `/events/{id}` | Update event |
| DELETE | `/events/{id}` | Delete event |

**GET /events?category=sales&start_date=2026-01-01&end_date=2026-03-11&event_type=win&limit=20&cursor=abc123**

```
Response (200):
{
    "events": [
        {
            "id": 45,
            "timestamp": "2026-03-10T14:30:00Z",
            "event_type": "win",
            "category": "sales",
            "title": "Closed Enterprise Deal - Acme Corp",
            "description": "Signed annual contract, $120K ARR",
            "outcome_rating": 5,
            "metadata": {
                "deal_value": 120000,
                "sales_cycle_days": 45
            },
            "source": "manual"
        }
    ],
    "next_cursor": "def456",
    "total_count": 38
}
```

### 3.5 Cycle Tracking

| Method | Path | Description |
|--------|------|-------------|
| POST | `/cycle/period` | Log period start (creates new cycle_entry) |
| PUT | `/cycle/period/{id}` | Update cycle entry (e.g., mark end date) |
| GET | `/cycle/entries` | Get cycle history |
| GET | `/cycle/phases` | Get predicted phases for date range |
| GET | `/cycle/current` | Get current cycle day and phase |
| PUT | `/cycle/profile` | Update cycle profile settings |

**POST /cycle/period**

```
Request:
{
    "start_date": "2026-03-01",
    "notes": null
}

Response (201):
{
    "cycle_entry": {
        "id": 7,
        "cycle_start_date": "2026-03-01",
        "cycle_end_date": null,
        "cycle_length": null
    },
    "previous_cycle_length": 28,
    "updated_average": 28.5,
    "predicted_phases_regenerated": true
}
```

**GET /cycle/phases?start_date=2026-03-11&end_date=2026-04-11**

```
Response (200):
{
    "phases": [
        {
            "date": "2026-03-11",
            "predicted_phase": "follicular",
            "confidence_score": 0.85,
            "cycle_day": 11,
            "based_on_cycles": 6
        },
        ...
    ]
}
```

### 3.6 Patterns

| Method | Path | Description |
|--------|------|-------------|
| GET | `/patterns` | Get all active patterns for user |
| GET | `/patterns/{id}` | Get pattern with data points |
| GET | `/patterns/summary` | Get top patterns with plain-language summary |

**GET /patterns**

```
Response (200):
{
    "patterns": [
        {
            "id": 12,
            "pattern_type": "energy_cycle",
            "description": "Your energy peaks between cycle days 10-14 (follicular/ovulatory phase), averaging 8.2 vs your overall average of 6.4.",
            "confidence_score": 0.87,
            "data_points_used": 84,
            "first_detected": "2026-01-15T10:00:00Z",
            "last_updated": "2026-03-10T10:00:00Z"
        },
        {
            "id": 15,
            "pattern_type": "cross_domain",
            "description": "When you log a morning workout, your afternoon confidence ratings are 1.8 points higher on average.",
            "confidence_score": 0.72,
            "data_points_used": 23,
            "first_detected": "2026-02-20T10:00:00Z",
            "last_updated": "2026-03-09T10:00:00Z"
        }
    ]
}
```

### 3.7 Insights

| Method | Path | Description |
|--------|------|-------------|
| GET | `/insights` | Get insight feed (paginated, sorted by relevance) |
| GET | `/insights/today` | Get today's insights |
| POST | `/insights/{id}/feedback` | Rate insight as helpful or not |
| GET | `/insights/history` | Get past insights with feedback status |

**GET /insights?limit=10&cursor=abc**

```
Response (200):
{
    "insights": [
        {
            "id": 89,
            "generated_date": "2026-03-11",
            "content": "This is historically one of your best days in the cycle. Three of your last four biggest wins happened during the follicular phase. Consider scheduling a challenging meeting or pitch today.",
            "category": "sales",
            "insight_type": "recommendation",
            "relevance_score": 0.93,
            "was_helpful": null,
            "expires_at": "2026-03-12T00:00:00Z"
        }
    ],
    "next_cursor": "def456"
}
```

**POST /insights/{id}/feedback**

```
Request:
{
    "was_helpful": true
}

Response (200):
{
    "message": "Feedback recorded. This helps us improve your insights."
}
```

### 3.8 Predictions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/predictions/week` | Get predictions for next 7 days |
| GET | `/predictions/{date}` | Get prediction for specific date |
| GET | `/predictions/accuracy` | Get prediction accuracy history |
| GET | `/predictions/best-days` | Get predicted best days in next 30 days |

**GET /predictions/week**

```
Response (200):
{
    "predictions": [
        {
            "prediction_date": "2026-03-12",
            "predicted_energy": 8,
            "predicted_confidence": 7,
            "cycle_phase": "follicular",
            "cycle_day": 12,
            "prediction_confidence": 0.78,
            "recommended_activities": [
                {
                    "activity": "Schedule your most important sales call",
                    "category": "sales",
                    "reason": "Energy + confidence both predicted above 7",
                    "priority": 1
                }
            ]
        }
    ],
    "best_day": {
        "date": "2026-03-14",
        "predicted_energy": 9,
        "predicted_confidence": 8
    }
}
```

**GET /predictions/accuracy?last_n_days=30**

```
Response (200):
{
    "overall_accuracy": 0.74,
    "energy_accuracy": 0.78,
    "confidence_accuracy": 0.71,
    "days_with_data": 24,
    "trend": "improving",
    "accuracy_by_week": [
        { "week_start": "2026-02-10", "accuracy": 0.68 },
        { "week_start": "2026-02-17", "accuracy": 0.72 },
        { "week_start": "2026-02-24", "accuracy": 0.76 },
        { "week_start": "2026-03-03", "accuracy": 0.79 }
    ]
}
```

### 3.9 Integrations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/integrations` | List all integrations and their status |
| POST | `/integrations/{type}/connect` | Start OAuth flow for integration |
| POST | `/integrations/{type}/callback` | OAuth callback handler |
| POST | `/integrations/{type}/disconnect` | Disconnect integration |
| POST | `/integrations/{type}/sync` | Force manual sync |
| GET | `/integrations/{type}/status` | Get detailed sync status |

**GET /integrations**

```
Response (200):
{
    "integrations": [
        {
            "integration_type": "google_calendar",
            "status": "active",
            "last_synced": "2026-03-11T08:00:00Z",
            "events_synced": 142,
            "connected_at": "2026-01-10T15:00:00Z"
        },
        {
            "integration_type": "oura",
            "status": "active",
            "last_synced": "2026-03-11T07:30:00Z",
            "events_synced": 68,
            "connected_at": "2026-02-01T12:00:00Z"
        },
        {
            "integration_type": "hubspot",
            "status": "disconnected",
            "last_synced": null,
            "events_synced": 0,
            "connected_at": null
        }
    ],
    "available": ["google_calendar", "apple_calendar", "hubspot", "salesforce",
                   "apple_health", "garmin", "whoop", "oura", "strava"]
}
```

### 3.10 User Profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update user profile |
| PUT | `/me/personas` | Update active personas |
| PUT | `/me/preferences` | Update preferences |
| POST | `/me/export` | Request full data export (async, returns download link) |
| GET | `/me/export/{export_id}` | Download completed export |
| GET | `/me/stats` | Get lifetime statistics |

**PUT /me/personas**

```
Request:
{
    "personas": ["sales", "athlete", "mom"]
}

Response (200):
{
    "personas": [
        { "persona_type": "sales", "is_active": true },
        { "persona_type": "athlete", "is_active": true },
        { "persona_type": "mom", "is_active": true }
    ]
}
```

**POST /me/export**

```
Response (202):
{
    "export_id": "exp_abc123",
    "status": "processing",
    "estimated_completion": "2026-03-11T16:00:00Z",
    "format": "json",
    "message": "Your data export is being prepared. You will receive a push notification when it is ready."
}
```

### 3.11 Weekly Briefings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/briefings/latest` | Get most recent weekly briefing |
| GET | `/briefings` | List all briefings (paginated) |
| POST | `/briefings/{id}/viewed` | Mark briefing as viewed |

---

## 4. AI/ML Pipeline Architecture

### 4.1 Pipeline Overview

```
+-------------------+     +------------------+     +--------------------+
|  Data Collection  | --> |  Preprocessing   | --> |  Feature           |
|                   |     |                  |     |  Engineering       |
|  - Daily checkins |     |  - Null handling |     |                    |
|  - Events         |     |  - Normalization |     |  - Rolling avgs    |
|  - Cycle data     |     |  - Outlier       |     |  - Cycle-aligned   |
|  - Integration    |     |    detection     |     |    features        |
|    syncs          |     |  - Time align    |     |  - Day-of-week     |
|                   |     |                  |     |  - Cross-domain    |
+-------------------+     +------------------+     |    correlations    |
                                                   +--------+-----------+
                                                            |
                          +------------------+              |
                          |  Feedback Loop   |              v
                          |                  |     +--------------------+
                          |  - Prediction    |     |  Pattern Detection |
                          |    accuracy      |     |                    |
                          |  - Insight       | <-- |  - Time-series     |
                          |    helpfulness   |     |    decomposition   |
                          |  - Model         |     |  - Correlation     |
                          |    retraining    |     |    analysis        |
                          |    triggers      |     |  - Clustering      |
                          +------------------+     +--------+-----------+
                                ^                           |
                                |                           v
                          +-----+------------+     +--------------------+
                          |  Insight         | <-- |  Prediction Engine |
                          |  Generation      |     |                    |
                          |                  |     |  - Rolling avg     |
                          |  - Template      |     |    baseline        |
                          |    engine        |     |  - Cycle-adjusted  |
                          |  - LLM enhance   |     |    predictions     |
                          |    (optional)    |     |  - Multi-signal    |
                          |  - Relevance     |     |    fusion          |
                          |    scoring       |     |                    |
                          +------------------+     +--------------------+
```

### 4.2 Data Collection Layer

**Trigger points:**
- Real-time: Each check-in, each manually logged event
- Scheduled: Integration syncs (every 15min-6hr depending on integration)
- Weekly: Briefing generation (Sunday evening in user's timezone)

**Minimum data requirements before each intelligence feature activates:**

| Feature | Minimum Data | Rationale |
|---------|-------------|-----------|
| Basic daily insight | 1 check-in | "Your energy today is X" |
| Day-of-week patterns | 14 check-ins across 3+ weeks | Need statistical significance across weekdays |
| Energy/confidence correlation | 14 check-ins | Enough for basic Pearson correlation |
| Cycle-phase correlation | 2 complete tracked cycles + check-ins | Need at least 2 cycles to detect phase patterns |
| Cycle-aware predictions | 3 complete tracked cycles + 60 check-ins | Improves confidence dramatically with 3+ cycles |
| Cross-domain patterns | 20 events + 20 check-ins with overlap | Need events to correlate with check-in data |
| Weekly predictions (non-cycle) | 30 check-ins across 5+ weeks | Rolling averages need 4+ weeks minimum |
| Weekly predictions (cycle-aware) | 3 cycles + 60 check-ins | Phase-specific predictions need solid cycle data |
| Integration-enhanced insights | 30 synced events + 30 check-ins | Need enough external data to find correlations |

### 4.3 Preprocessing

```python
# Pseudocode for preprocessing pipeline

class Preprocessor:
    def process_checkins(self, user_id: int, days: int = 90) -> pd.DataFrame:
        """
        1. Fetch raw check-ins for date range
        2. Handle missing days:
           - Mark as NaN (do not interpolate -- missing data is meaningful)
           - Track checkin_completion_rate for confidence weighting
        3. Normalize scores per-user:
           - Some users are "generous graders" (avg energy = 8)
           - Some are harsh (avg energy = 4)
           - Z-score normalize relative to user's own mean/std
           - Keep raw values for display, use normalized for analysis
        4. Detect outliers:
           - Flag days where energy/confidence change > 2 std from mean delta
           - Don't remove -- flag for separate analysis (could be real events)
        5. Align to user timezone:
           - All timestamps stored in UTC
           - Convert to user's local date for day-boundary alignment
        """
        pass

    def align_to_cycle(self, checkins_df: pd.DataFrame, cycle_entries: list) -> pd.DataFrame:
        """
        Add cycle_day and predicted_phase columns to checkin data.
        For users not tracking cycles, skip this step entirely.
        """
        pass

    def merge_events(self, checkins_df: pd.DataFrame, events: list) -> pd.DataFrame:
        """
        For each checkin day, attach:
        - count of events by category
        - count of wins vs challenges
        - average outcome_rating for events that day
        """
        pass
```

### 4.4 Feature Engineering

```python
class FeatureEngineer:
    def build_features(self, preprocessed_df: pd.DataFrame) -> pd.DataFrame:
        features = preprocessed_df.copy()

        # Temporal features
        features['day_of_week'] = features['date'].dt.dayofweek       # 0=Mon, 6=Sun
        features['is_weekend'] = features['day_of_week'].isin([5, 6])
        features['week_of_year'] = features['date'].dt.isocalendar().week

        # Rolling averages (key for baseline prediction)
        for window in [3, 7, 14, 28]:
            features[f'energy_rolling_{window}d'] = (
                features['energy_level'].rolling(window, min_periods=max(1, window//2)).mean()
            )
            features[f'confidence_rolling_{window}d'] = (
                features['confidence_level'].rolling(window, min_periods=max(1, window//2)).mean()
            )

        # Day-over-day deltas
        features['energy_delta'] = features['energy_level'].diff()
        features['confidence_delta'] = features['confidence_level'].diff()

        # Cycle-aligned features (if cycle tracking enabled)
        if 'cycle_day' in features.columns:
            # Group by cycle_day, compute mean energy/confidence per cycle day
            cycle_means = features.groupby('cycle_day').agg({
                'energy_level': 'mean',
                'confidence_level': 'mean'
            }).rename(columns={
                'energy_level': 'cycle_day_avg_energy',
                'confidence_level': 'cycle_day_avg_confidence'
            })
            features = features.merge(cycle_means, on='cycle_day', how='left')

            # Deviation from cycle-day average
            features['energy_cycle_deviation'] = (
                features['energy_level'] - features['cycle_day_avg_energy']
            )

        # Cross-domain features
        features['had_workout'] = features.get('fitness_event_count', 0) > 0
        features['had_win'] = features.get('win_count', 0) > 0
        features['sleep_energy_interaction'] = (
            features.get('sleep_quality', 5) * features['energy_level']
        )

        return features
```

### 4.5 Pattern Detection

Three detection strategies, run in order of complexity:

#### Strategy 1: Statistical Correlation (Runs from Day 14)

```python
class CorrelationDetector:
    """
    Detects simple linear relationships between variables.
    """
    def detect(self, features_df: pd.DataFrame, min_r: float = 0.4) -> list[Pattern]:
        patterns = []

        # Pairs to check for correlation
        pairs = [
            ('sleep_quality', 'energy_level', 'Sleep affects your energy'),
            ('stress_level', 'confidence_level', 'Stress affects your confidence'),
            ('had_workout', 'confidence_level', 'Working out affects your confidence'),
            ('had_workout', 'energy_level', 'Working out affects your energy'),
        ]

        for col_a, col_b, template in pairs:
            if col_a not in features_df.columns:
                continue
            clean = features_df[[col_a, col_b]].dropna()
            if len(clean) < 14:
                continue
            r, p_value = pearsonr(clean[col_a], clean[col_b])
            if abs(r) >= min_r and p_value < 0.05:
                direction = "positively" if r > 0 else "negatively"
                patterns.append(Pattern(
                    pattern_type='cross_domain',
                    description=f"{template} ({direction} correlated, r={r:.2f})",
                    confidence_score=min(abs(r), 0.99),
                    data_points_used=len(clean)
                ))

        return patterns
```

#### Strategy 2: Cycle-Phase Analysis (Runs after 2+ tracked cycles)

```python
class CyclePhaseDetector:
    """
    Detects performance patterns tied to menstrual cycle phases.
    This is the core differentiator of PeakHer.
    """
    def detect(self, features_df: pd.DataFrame) -> list[Pattern]:
        patterns = []

        if 'cycle_day' not in features_df.columns:
            return patterns

        # Require at least 2 complete cycles of data
        cycle_days_covered = features_df['cycle_day'].nunique()
        if cycle_days_covered < 20:
            return patterns

        # Group by predicted phase, compute stats
        phase_stats = features_df.groupby('predicted_phase').agg({
            'energy_level': ['mean', 'std', 'count'],
            'confidence_level': ['mean', 'std', 'count'],
        })

        overall_energy_mean = features_df['energy_level'].mean()
        overall_confidence_mean = features_df['confidence_level'].mean()

        for phase in ['menstrual', 'follicular', 'ovulatory', 'luteal']:
            if phase not in phase_stats.index:
                continue

            energy_mean = phase_stats.loc[phase, ('energy_level', 'mean')]
            confidence_mean = phase_stats.loc[phase, ('confidence_level', 'mean')]
            count = phase_stats.loc[phase, ('energy_level', 'count')]

            if count < 5:
                continue

            # Detect if this phase is significantly different from overall
            energy_diff = energy_mean - overall_energy_mean
            confidence_diff = confidence_mean - overall_confidence_mean

            if abs(energy_diff) >= 0.8:
                direction = "higher" if energy_diff > 0 else "lower"
                patterns.append(Pattern(
                    pattern_type='energy_cycle',
                    description=f"Your energy is consistently {direction} during the {phase} phase "
                                f"(avg {energy_mean:.1f} vs your overall avg {overall_energy_mean:.1f})",
                    confidence_score=min(0.5 + (count / 100), 0.95),
                    data_points_used=int(count)
                ))

            if abs(confidence_diff) >= 0.8:
                direction = "higher" if confidence_diff > 0 else "lower"
                patterns.append(Pattern(
                    pattern_type='confidence_cycle',
                    description=f"Your confidence is consistently {direction} during the {phase} phase "
                                f"(avg {confidence_mean:.1f} vs your overall avg {overall_confidence_mean:.1f})",
                    confidence_score=min(0.5 + (count / 100), 0.95),
                    data_points_used=int(count)
                ))

        # Detect peak performance windows (both energy AND confidence above average)
        features_df['is_peak'] = (
            (features_df['energy_level'] > overall_energy_mean + 0.5) &
            (features_df['confidence_level'] > overall_confidence_mean + 0.5)
        )
        peak_by_day = features_df.groupby('cycle_day')['is_peak'].mean()
        peak_days = peak_by_day[peak_by_day > 0.6].index.tolist()

        if len(peak_days) >= 3:
            day_range = f"cycle days {min(peak_days)}-{max(peak_days)}"
            patterns.append(Pattern(
                pattern_type='performance_peak',
                description=f"Your peak performance window is {day_range}. "
                            f"Both energy and confidence are above average more than 60% of the time on these days.",
                confidence_score=min(0.6 + (len(features_df) / 200), 0.95),
                data_points_used=len(features_df)
            ))

        return patterns
```

#### Strategy 3: Day-of-Week / Temporal Patterns (Runs from Day 21)

```python
class TemporalDetector:
    """
    Detects day-of-week patterns independent of cycle.
    """
    def detect(self, features_df: pd.DataFrame) -> list[Pattern]:
        patterns = []
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        dow_stats = features_df.groupby('day_of_week').agg({
            'energy_level': ['mean', 'count'],
            'confidence_level': ['mean', 'count']
        })

        overall_energy = features_df['energy_level'].mean()

        for dow in range(7):
            if dow not in dow_stats.index:
                continue
            count = dow_stats.loc[dow, ('energy_level', 'count')]
            if count < 3:
                continue

            energy_mean = dow_stats.loc[dow, ('energy_level', 'mean')]
            diff = energy_mean - overall_energy

            if abs(diff) >= 1.0:
                direction = "highest" if diff > 0 else "lowest"
                patterns.append(Pattern(
                    pattern_type='energy_cycle',
                    description=f"{day_names[dow]}s tend to be your {direction} energy day "
                                f"(avg {energy_mean:.1f} vs overall {overall_energy:.1f})",
                    confidence_score=min(0.4 + (count / 20), 0.90),
                    data_points_used=int(count)
                ))

        return patterns
```

### 4.6 Prediction Engine

The prediction model evolves through three phases:

#### Phase 1: Baseline Model (Launch)

Simple, interpretable, requires minimal data.

```python
class BaselinePredictor:
    """
    Weighted combination of:
    - 7-day rolling average (recency weight)
    - Day-of-week historical average
    - Cycle-day historical average (if available)
    """
    def predict(self, user_id: int, target_date: date) -> Prediction:
        features = self.feature_store.get_features(user_id)

        # Component 1: Rolling average (last 7 days)
        rolling_energy = features['energy_rolling_7d'].iloc[-1]
        rolling_confidence = features['confidence_rolling_7d'].iloc[-1]

        # Component 2: Day-of-week average
        target_dow = target_date.weekday()
        dow_data = features[features['day_of_week'] == target_dow]
        dow_energy = dow_data['energy_level'].mean() if len(dow_data) >= 3 else rolling_energy
        dow_confidence = dow_data['confidence_level'].mean() if len(dow_data) >= 3 else rolling_confidence

        # Component 3: Cycle-day average (if tracking)
        cycle_day = self.get_predicted_cycle_day(user_id, target_date)
        if cycle_day and 'cycle_day_avg_energy' in features.columns:
            cd_data = features[features['cycle_day'] == cycle_day]
            if len(cd_data) >= 2:
                cycle_energy = cd_data['energy_level'].mean()
                cycle_confidence = cd_data['confidence_level'].mean()
                # Cycle-aware weighting
                weights = [0.3, 0.2, 0.5]  # rolling, dow, cycle
                pred_energy = np.average(
                    [rolling_energy, dow_energy, cycle_energy], weights=weights
                )
                pred_confidence = np.average(
                    [rolling_confidence, dow_confidence, cycle_confidence], weights=weights
                )
            else:
                weights = [0.6, 0.4]
                pred_energy = np.average([rolling_energy, dow_energy], weights=weights)
                pred_confidence = np.average([rolling_confidence, dow_confidence], weights=weights)
        else:
            weights = [0.6, 0.4]
            pred_energy = np.average([rolling_energy, dow_energy], weights=weights)
            pred_confidence = np.average([rolling_confidence, dow_confidence], weights=weights)

        # Clamp and round
        pred_energy = int(np.clip(np.round(pred_energy), 1, 10))
        pred_confidence = int(np.clip(np.round(pred_confidence), 1, 10))

        # Confidence score based on data availability
        data_days = len(features)
        has_cycle = cycle_day is not None
        confidence = min(0.3 + (data_days / 100) + (0.15 if has_cycle else 0), 0.95)

        return Prediction(
            prediction_date=target_date,
            predicted_energy=pred_energy,
            predicted_confidence=pred_confidence,
            prediction_confidence=round(confidence, 2),
            recommended_activities=self.generate_recommendations(
                pred_energy, pred_confidence, user_id
            )
        )
```

#### Phase 2: Gradient Boosted Model (After 1000+ users)

```python
# Switch to XGBoost/LightGBM when we have enough data
# Features: all engineered features above
# Target: next-day energy, next-day confidence
# Training: per-user models with global model as warm start
# Retrain: weekly per user (Celery scheduled task)
# Key advantage: can capture non-linear interactions
#   (e.g., cycle day 24 + poor sleep + high stress = particularly bad day)
```

#### Phase 3: Neural Model (After 10,000+ users, optional)

```python
# LSTM or Transformer model on time-series
# Would capture long-range temporal dependencies
# Only justified if Phase 2 accuracy plateaus and data volume supports it
# Could also enable cross-user pattern discovery (anonymized):
#   "Women in sales roles with similar cycle lengths tend to..."
```

### 4.7 Insight Generation

#### Template Engine (Phase 1)

```python
class InsightGenerator:
    TEMPLATES = {
        'energy_peak_today': {
            'template': "Today is predicted to be a high-energy day for you (predicted: {predicted_energy}/10). "
                        "{phase_context}"
                        "Consider tackling your most demanding tasks.",
            'insight_type': 'recommendation',
            'min_confidence': 0.6,
        },
        'cycle_pattern_new': {
            'template': "New pattern detected: {pattern_description} "
                        "(based on {data_points} data points, {confidence_pct}% confidence).",
            'insight_type': 'observation',
            'min_confidence': 0.5,
        },
        'prediction_accuracy': {
            'template': "Your prediction accuracy this week was {accuracy_pct}%. "
                        "{trend_context}",
            'insight_type': 'observation',
            'min_confidence': 0.0,
        },
        'anomaly_detected': {
            'template': "Your {metric} today ({actual}) is notably {direction} than your {phase} phase average ({avg:.1f}). "
                        "{possible_reason}",
            'insight_type': 'anomaly',
            'min_confidence': 0.7,
        },
        'cross_domain_correlation': {
            'template': "We have noticed that {pattern_description}. "
                        "This pattern has held {frequency} of the time over the last {period}.",
            'insight_type': 'observation',
            'min_confidence': 0.6,
        }
    }

    def generate_daily_insights(self, user_id: int) -> list[Insight]:
        insights = []
        user_patterns = self.pattern_store.get_active(user_id)
        today_prediction = self.prediction_store.get(user_id, date.today())
        checkin_history = self.checkin_store.get_recent(user_id, days=90)

        # Rule 1: If today is a predicted peak day, recommend action
        if today_prediction and today_prediction.predicted_energy >= 7:
            insights.append(self.from_template('energy_peak_today', ...))

        # Rule 2: If a new pattern was detected in last 24h, surface it
        new_patterns = [p for p in user_patterns if p.first_detected > yesterday]
        for pattern in new_patterns:
            insights.append(self.from_template('cycle_pattern_new', ...))

        # Rule 3: If today's checkin is anomalous vs prediction, note it
        # (Generated after check-in, not before)

        # Dedup and rank by relevance
        insights = self.rank_and_dedup(insights, max_insights=3)
        return insights
```

#### LLM Enhancement (Phase 2)

```python
class LLMInsightEnhancer:
    """
    Takes template-generated insights and makes them more natural,
    personalized, and actionable using an LLM.

    IMPORTANT: No user health data is sent to the LLM.
    Only aggregated, anonymized pattern descriptions are sent.
    """
    def enhance(self, raw_insight: str, user_personas: list[str]) -> str:
        prompt = f"""
        You are a personal performance coach for a woman who identifies as: {', '.join(user_personas)}.

        Rewrite this insight to be warm, specific, and actionable:
        "{raw_insight}"

        Rules:
        - Keep it to 2-3 sentences max
        - Be encouraging but not patronizing
        - Include one specific, actionable suggestion
        - Do not use medical language or make health claims
        - Do not diagnose or prescribe
        """
        return self.llm.generate(prompt)
```

### 4.8 Feedback Loop

```python
class FeedbackProcessor:
    """
    Runs nightly. Closes the loop between predictions and actuals.
    """
    def process_daily(self):
        # 1. For each user who checked in today:
        #    - Find yesterday's prediction for today
        #    - Fill in actual_energy, actual_confidence
        #    - accuracy_score auto-computes via generated column

        # 2. Check insight feedback:
        #    - Aggregate was_helpful rates by insight_type and template
        #    - If a template's helpfulness rate < 30% over 50+ ratings, flag for review
        #    - If a template's helpfulness rate > 70%, boost its relevance_score weight

        # 3. Pattern validation:
        #    - If a pattern's predictions consistently miss (accuracy < 0.5 over 14 days),
        #      reduce pattern confidence_score
        #    - If accuracy < 0.3 over 28 days, deactivate pattern (is_active = False)

        # 4. Model retraining trigger:
        #    - If overall prediction accuracy drops below 0.6 for a user,
        #      queue a model retrain task for that user
        pass
```

### 4.9 ML Pipeline Scheduling

| Task | Frequency | Trigger | Queue Priority |
|------|-----------|---------|----------------|
| Pattern detection | On each check-in | Celery task, async | Medium |
| Prediction generation (next 7 days) | Daily at midnight user-tz | Celery Beat | High |
| Feedback processing | Daily at 2am UTC | Celery Beat | Medium |
| Weekly briefing generation | Weekly, user's preferred day/time | Celery Beat | Medium |
| Integration sync | Every 15min-6hr (varies) | Celery Beat | Low |
| Model retraining | Weekly, or on accuracy trigger | Celery Beat / manual | Low |
| Insight generation | Daily after predictions | Celery task, chained | Medium |

---

## 5. Integration Architecture

### 5.1 Integration Strategy by Type

| Integration | Auth Method | Sync Strategy | Sync Frequency | Data Extracted |
|------------|-------------|---------------|----------------|----------------|
| Google Calendar | OAuth 2.0 | Webhook (push notifications) + polling fallback | Real-time (webhook) / 15min (poll) | Events: meetings, blocked time, event titles |
| Apple Calendar | EventKit (on-device) | Local API via React Native | On app open + background refresh | Events: same as Google |
| HubSpot | OAuth 2.0 | Webhook (CRM events) | Real-time (webhook) / 1hr (poll) | Deals closed, meetings logged, emails sent |
| Salesforce | OAuth 2.0 (JWT Bearer) | Polling via REST API | 1hr | Opportunities, tasks completed, meetings |
| Apple Health | HealthKit (on-device) | Local API via React Native | On app open + background | Sleep, workouts, HRV, steps, active energy |
| Garmin | OAuth 1.0a | Polling via Connect API | 6hr | Sleep, activities, stress score, body battery |
| Whoop | OAuth 2.0 | Webhook + polling | Real-time (webhook) / 1hr (poll) | Recovery score, strain, sleep performance |
| Oura | OAuth 2.0 (Personal) | Polling via REST API | 6hr | Readiness score, sleep score, activity |
| Strava | OAuth 2.0 | Webhook (activity create) | Real-time (webhook) / 6hr (poll) | Activities: type, duration, effort |

### 5.2 OAuth Flow

```
+--------+                               +----------+                    +-----------+
| Mobile |                               |  PeakHer |                    | Provider  |
|  App   |                               |   API    |                    | (e.g.     |
|        |                               |          |                    |  Google)  |
+---+----+                               +----+-----+                    +-----+-----+
    |                                          |                               |
    |  1. POST /integrations/google/connect    |                               |
    |----------------------------------------->|                               |
    |                                          |                               |
    |  2. Return auth_url + state + PKCE       |                               |
    |<-----------------------------------------|                               |
    |                                          |                               |
    |  3. Open in-app browser                  |                               |
    |-------------------------------------------------------->                 |
    |                                          |               User consents   |
    |  4. Redirect to callback with code       |                               |
    |<---------------------------------------------------------|               |
    |                                          |                               |
    |  5. POST /integrations/google/callback   |                               |
    |     { code, state, code_verifier }       |                               |
    |----------------------------------------->|                               |
    |                                          |  6. Exchange code for tokens   |
    |                                          |------------------------------>|
    |                                          |                               |
    |                                          |  7. Return access + refresh   |
    |                                          |<------------------------------|
    |                                          |                               |
    |                                          |  8. Encrypt tokens, store     |
    |                                          |  9. Queue initial sync task   |
    |                                          |                               |
    |  10. { status: "connected" }             |                               |
    |<-----------------------------------------|                               |
    |                                          |                               |
```

### 5.3 Data Mapping Layer

All external data is normalized into the internal `events` model through mappers:

```python
class IntegrationMapper(ABC):
    @abstractmethod
    def map_to_event(self, raw_data: dict) -> Event | None:
        """Convert provider-specific data into a PeakHer Event, or None if not relevant."""
        pass

class GoogleCalendarMapper(IntegrationMapper):
    def map_to_event(self, raw_data: dict) -> Event | None:
        # Skip declined events
        if raw_data.get('attendees'):
            user_response = next(
                (a for a in raw_data['attendees'] if a.get('self')), {}
            ).get('responseStatus')
            if user_response == 'declined':
                return None

        # Categorize by keywords in title/description
        title = raw_data.get('summary', '')
        category = self.categorize(title)

        return Event(
            timestamp=parse_datetime(raw_data['start']['dateTime']),
            event_type='custom',
            category=category,
            title=self.sanitize_title(title),  # Remove sensitive details
            source='calendar',
            metadata={
                'duration_minutes': self.calc_duration(raw_data),
                'is_recurring': raw_data.get('recurringEventId') is not None,
                'attendee_count': len(raw_data.get('attendees', [])),
            }
        )

    def categorize(self, title: str) -> str:
        """Rule-based categorization. User can override via preferences."""
        title_lower = title.lower()
        if any(w in title_lower for w in ['sales', 'demo', 'prospect', 'deal', 'pipeline']):
            return 'sales'
        if any(w in title_lower for w in ['gym', 'run', 'yoga', 'workout', 'training']):
            return 'fitness'
        if any(w in title_lower for w in ['board', 'strategy', '1:1', 'team', 'standup']):
            return 'leadership'
        return 'personal'


class OuraMapper(IntegrationMapper):
    def map_to_event(self, raw_data: dict) -> Event | None:
        """Map Oura daily readiness/sleep to events."""
        return Event(
            timestamp=parse_date(raw_data['day']),
            event_type='custom',
            category='fitness',
            title=f"Oura: Readiness {raw_data['score']}",
            source='fitness_tracker',
            metadata={
                'readiness_score': raw_data.get('score'),
                'sleep_score': raw_data.get('sleep', {}).get('score'),
                'hrv_average': raw_data.get('hrv', {}).get('average'),
                'resting_hr': raw_data.get('resting_heart_rate'),
            }
        )
```

### 5.4 Sync Engine

```python
class SyncEngine:
    """
    Handles the full sync lifecycle for each integration.
    """
    MAX_RETRIES = 3
    BACKOFF_BASE = 60  # seconds

    async def sync(self, integration_id: int):
        integration = await self.db.get_integration(integration_id)

        try:
            # 1. Decrypt credentials
            tokens = self.crypto.decrypt(integration.credentials_encrypted)

            # 2. Check token expiry, refresh if needed
            if tokens['expires_at'] < datetime.utcnow():
                tokens = await self.refresh_token(integration)

            # 3. Fetch new data since last sync
            provider = self.get_provider(integration.integration_type)
            raw_events = await provider.fetch_since(
                tokens=tokens,
                since=integration.last_synced or integration.created_at
            )

            # 4. Map and store
            mapper = self.get_mapper(integration.integration_type)
            for raw in raw_events:
                # Store raw (encrypted) for audit trail
                integration_event = IntegrationEvent(
                    integration_id=integration.id,
                    user_id=integration.user_id,
                    external_id=raw['id'],
                    raw_data=self.crypto.encrypt(json.dumps(raw)),
                )

                # Map to internal event
                mapped = mapper.map_to_event(raw)
                if mapped:
                    mapped.user_id = integration.user_id
                    event = await self.db.upsert_event(mapped)
                    integration_event.mapped_event_id = event.id

                await self.db.upsert_integration_event(integration_event)

            # 5. Update sync status
            integration.last_synced = datetime.utcnow()
            integration.status = 'active'
            integration.error_count = 0
            await self.db.update_integration(integration)

        except RateLimitError as e:
            # Back off, retry later
            retry_after = e.retry_after or self.BACKOFF_BASE
            self.schedule_retry(integration_id, delay=retry_after)

        except AuthError:
            # Token refresh failed -- mark as error
            integration.status = 'error'
            integration.error_message = 'Authentication failed. Please reconnect.'
            integration.error_count += 1
            await self.db.update_integration(integration)
            # Notify user via push notification
            await self.notifier.send(integration.user_id,
                f"Your {integration.integration_type} connection needs attention.")

        except Exception as e:
            integration.error_count += 1
            integration.error_message = str(e)[:500]
            if integration.error_count >= self.MAX_RETRIES:
                integration.status = 'error'
            await self.db.update_integration(integration)
            logger.exception(f"Sync failed for integration {integration_id}")
```

### 5.5 Rate Limiting Strategy

| Provider | Rate Limit | Our Strategy |
|----------|-----------|--------------|
| Google Calendar | 1M requests/day (generous) | No concern at early scale. Batch where possible. |
| HubSpot | 100 requests/10sec | Queue requests, max 5/sec with burst buffer |
| Salesforce | 100K requests/day (Enterprise) | Batch SOQL queries, sync only delta |
| Oura | 5000 requests/day (Personal) | 1 sync per 6 hours per user. Batch daily summaries. |
| Whoop | 100 requests/min | Queue requests, respect Retry-After headers |
| Garmin | 25 requests/sec | Moderate. Batch requests. |
| Strava | 100 requests/15min, 1000/day | Webhook-primary. Polling only as fallback. |

---

## 6. Security & Privacy Architecture

### 6.1 Core Privacy Principles

1. **Health data is sacred.** Menstrual cycle data, energy levels, and sleep data are treated as protected health information (PHI-adjacent) even though PeakHer is not a covered entity under HIPAA.
2. **No data selling. Ever.** User data is never sold, shared with third parties for advertising, or used for any purpose beyond improving the individual user's experience.
3. **No third-party analytics on health data.** No Mixpanel/Amplitude/Google Analytics touches health data. Product analytics are limited to anonymized usage metrics (feature usage counts, retention rates) that contain zero health information.
4. **User owns their data.** Full export available at any time. Hard delete on request.
5. **Minimize what we store.** Integration raw data is encrypted and retained only for mapping verification. Purged after 90 days.

### 6.2 Encryption Architecture

#### In Transit

- All API communication over TLS 1.3 (minimum TLS 1.2)
- Certificate pinning in the mobile app
- HSTS headers on all endpoints

#### At Rest -- Database Level

```
PostgreSQL Transparent Data Encryption (TDE) via cloud provider:
- AWS RDS: Storage encryption with AES-256 (AWS-managed KMS key)
- Supabase: Encryption at rest enabled by default

This encrypts the entire database volume. Protects against physical disk theft
but NOT against application-level access.
```

#### At Rest -- Field-Level Encryption

Sensitive columns receive an additional layer of application-level encryption using `pgcrypto` or application-layer AES-256-GCM:

```sql
-- Fields that receive field-level encryption:
-- integrations.credentials_encrypted      -- Already BYTEA, encrypted at app layer
-- integrations.refresh_token_encrypted    -- Already BYTEA, encrypted at app layer
-- integration_events.raw_data             -- Already BYTEA, encrypted at app layer
-- daily_checkins.notes                    -- Encrypted at app layer before storage
-- cycle_entries.notes                     -- Encrypted at app layer before storage
-- events.description                      -- Encrypted at app layer before storage
```

**Encryption key management:**

```python
class FieldEncryption:
    """
    AES-256-GCM encryption for sensitive fields.
    Key hierarchy:
      - Master Key: stored in AWS KMS / environment variable (never in DB)
      - Per-user Data Encryption Key (DEK): generated on signup, encrypted with master key,
        stored in users table
      - Field encryption uses user's DEK
    """
    def encrypt(self, plaintext: str, user_dek: bytes) -> bytes:
        # AES-256-GCM
        nonce = os.urandom(12)
        cipher = AES.new(user_dek, AES.MODE_GCM, nonce=nonce)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode())
        return nonce + tag + ciphertext  # 12 + 16 + len(ciphertext) bytes

    def decrypt(self, data: bytes, user_dek: bytes) -> str:
        nonce = data[:12]
        tag = data[12:28]
        ciphertext = data[28:]
        cipher = AES.new(user_dek, AES.MODE_GCM, nonce=nonce)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
        return plaintext.decode()
```

### 6.3 Authentication & Authorization

```
Authentication Flow (Mobile):

1. Signup/Login:
   - Password hashed with Argon2id (memory: 64MB, iterations: 3, parallelism: 4)
   - Returns JWT access token (15min TTL) + refresh token (30 day TTL)
   - Refresh token stored in secure keychain (iOS Keychain / Android Keystore)

2. Access token (JWT):
   - Algorithm: RS256
   - Claims: { sub: user_id, iat, exp, jti }
   - Short-lived (15 minutes)

3. Refresh token:
   - Opaque token (not JWT)
   - Stored hashed in DB (bcrypt)
   - Single-use: each refresh issues new access + refresh token pair
   - Rotation detection: if a refresh token is used twice, all sessions invalidated
     (indicates token theft)

4. Biometric unlock:
   - Optional Face ID / Touch ID for app access
   - Biometric does NOT replace JWT -- it unlocks the stored refresh token
   - If biometric fails 5x, require full password re-entry
```

### 6.4 Data Retention & Deletion

| Data Type | Retention | On Account Delete |
|-----------|-----------|-------------------|
| User profile | Until account deleted | Hard deleted |
| Daily check-ins | Until account deleted | Hard deleted |
| Events | Until account deleted | Hard deleted |
| Cycle data | Until account deleted | Hard deleted |
| Patterns & insights | Until account deleted | Hard deleted |
| Predictions | Until account deleted | Hard deleted |
| Integration credentials | Until disconnected or account deleted | Hard deleted |
| Integration raw data | 90 days after sync | Hard deleted |
| Weekly briefings | Until account deleted | Hard deleted |
| Server logs (no PII) | 30 days | N/A (no PII) |
| Error logs (may contain user_id) | 14 days | Anonymized |

**Hard delete implementation:**

```python
async def delete_account(user_id: int):
    """
    Permanently deletes all user data. This is NOT reversible.
    Uses ON DELETE CASCADE for most tables.
    Additional cleanup for integration credentials and cached data.
    """
    async with db.transaction():
        # 1. Delete from tables without CASCADE (if any)
        # (All our FKs use ON DELETE CASCADE, so this handles it)

        # 2. Delete user (cascades to all dependent tables)
        await db.execute("DELETE FROM users WHERE id = $1", user_id)

        # 3. Purge from Redis cache
        await redis.delete(f"user:{user_id}:*")

        # 4. Delete any pending export files from S3
        await s3.delete_prefix(f"exports/{user_id}/")

        # 5. Log deletion (anonymized -- no PII in log)
        logger.info(f"Account deleted: user_id={user_id} at {datetime.utcnow()}")
```

### 6.5 Data Export

```python
async def export_user_data(user_id: int) -> str:
    """
    Generates a complete JSON export of all user data.
    Returns a signed, time-limited download URL.
    """
    export = {
        "export_version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "user": await serialize_user(user_id),
        "personas": await serialize_personas(user_id),
        "preferences": await serialize_preferences(user_id),
        "cycle_profile": await serialize_cycle_profile(user_id),
        "daily_checkins": await serialize_checkins(user_id),  # All of them
        "events": await serialize_events(user_id),
        "cycle_entries": await serialize_cycle_entries(user_id),
        "predicted_phases": await serialize_predicted_phases(user_id),
        "patterns": await serialize_patterns(user_id),
        "insights": await serialize_insights(user_id),
        "predictions": await serialize_predictions(user_id),
        "weekly_briefings": await serialize_briefings(user_id),
        "integrations": await serialize_integrations(user_id),  # Status only, no creds
    }

    # Encrypt the export file itself
    encrypted = encrypt_export(json.dumps(export), user_dek)

    # Upload to S3 with 24hr expiry
    url = await s3.upload_with_presigned_url(
        key=f"exports/{user_id}/{datetime.utcnow().isoformat()}.json.enc",
        data=encrypted,
        expires_in=86400
    )
    return url
```

### 6.6 Security Checklist

- [ ] All API endpoints require authentication except signup/login/password-reset
- [ ] Input validation on all fields (Pydantic models, SQL parameterized queries)
- [ ] Rate limiting on auth endpoints (10/min) and general API (100/min)
- [ ] CORS restricted to app bundle identifier
- [ ] No health data in server logs
- [ ] No health data sent to third-party analytics
- [ ] Integration tokens encrypted with per-user keys
- [ ] Refresh token rotation with theft detection
- [ ] Password minimum 12 characters, Argon2id hashing
- [ ] SQL injection protection via parameterized queries (SQLAlchemy ORM)
- [ ] XSS protection via API-only architecture (no server-rendered HTML)
- [ ] CSRF not applicable (JWT-based, no cookies)
- [ ] Dependency scanning (Dependabot or Snyk)
- [ ] Penetration testing before launch
- [ ] Privacy policy clearly states: no data selling, hard delete, full export

---

## 7. Infrastructure

### 7.1 Recommended Architecture: Supabase + Railway (Early Stage)

For the 0-1000 user phase, optimizing for speed of development and low operational overhead.

```
+----------------------------------------------+
|              Supabase (Managed)               |
|                                               |
|  +------------------+  +------------------+   |
|  | PostgreSQL 16    |  | Supabase Auth    |   |
|  | (with pgcrypto,  |  | (JWT, OAuth,     |   |
|  |  pg_trgm)        |  |  magic link)     |   |
|  +------------------+  +------------------+   |
|                                               |
|  +------------------+  +------------------+   |
|  | Supabase Storage |  | Edge Functions   |   |
|  | (for exports)    |  | (webhooks,       |   |
|  |                  |  |  lightweight)     |   |
|  +------------------+  +------------------+   |
|                                               |
+----------------------------------------------+
          |
          v
+----------------------------------------------+
|              Railway (App Hosting)            |
|                                               |
|  +------------------+  +------------------+   |
|  | FastAPI App      |  | Celery Workers   |   |
|  | (API server)     |  | (background      |   |
|  |                  |  |  tasks, ML)       |   |
|  +------------------+  +------------------+   |
|                                               |
|  +------------------+                         |
|  | Redis            |                         |
|  | (cache + broker) |                         |
|  +------------------+                         |
|                                               |
+----------------------------------------------+
          |
          v
+----------------------------------------------+
|              Cloudflare (Edge)                |
|                                               |
|  +------------------+  +------------------+   |
|  | CDN              |  | R2 Storage       |   |
|  | (static assets)  |  | (export files)   |   |
|  +------------------+  +------------------+   |
|                                               |
+----------------------------------------------+
```

**Why Supabase for DB:**
- Managed PostgreSQL with automated backups (daily, 7-day retention on Pro)
- Built-in auth that supports all needed flows (email/password, OAuth, magic link)
- Row-Level Security (RLS) as an additional defense layer
- Realtime subscriptions (useful for live dashboard updates later)
- Edge Functions for lightweight webhook handlers
- Storage for data exports
- $25/month Pro plan covers the first 1000+ users easily

**Why Railway for compute:**
- Simple container deployment from Git
- Built-in Redis (no separate service to manage)
- Celery workers run as separate services but same codebase
- Auto-scaling, sleep on idle
- $5-20/month at early stage

**Alternative: Full Supabase (simpler but less flexible)**
- Use Supabase Edge Functions instead of FastAPI
- Limitation: Edge Functions are Deno-based, not Python -- ML pipeline would need a separate service
- Verdict: Supabase for DB/Auth/Storage, Railway for FastAPI/Celery/ML

### 7.2 Migration Path to AWS (Growth Stage: 10,000+ users)

```
Supabase PostgreSQL --> AWS RDS PostgreSQL (with TimescaleDB AMI)
Railway FastAPI     --> AWS ECS Fargate (containerized)
Railway Celery      --> AWS ECS Fargate (separate service)
Railway Redis       --> AWS ElastiCache Redis
Cloudflare R2       --> AWS S3
                    +   AWS SQS (replacing Celery for some workloads)
                    +   AWS SageMaker (ML model training/serving)
                    +   AWS CloudWatch (monitoring)
                    +   AWS WAF (web application firewall)
```

### 7.3 Database Hosting & Backups

**Supabase (0-10K users):**
- Daily automated backups (Pro plan: 7-day retention)
- Point-in-time recovery (Pro plan)
- Read replicas available on Team plan if needed
- Connection pooling via Supavisor (built-in)

**AWS RDS (10K+ users):**
- Automated backups with 35-day retention
- Multi-AZ deployment for high availability
- Read replicas for analytics queries (pattern detection reads from replica)
- Performance Insights for query optimization

**Backup strategy:**

```
Frequency       | Type              | Retention  | Storage
----------------|-------------------|------------|--------
Continuous      | WAL archiving     | 7 days     | S3
Daily (2am UTC) | Full snapshot     | 30 days    | S3
Weekly (Sun)    | Full snapshot     | 90 days    | S3 Glacier
Monthly         | Full snapshot     | 1 year     | S3 Glacier
```

### 7.4 CI/CD Pipeline

```
+--------+     +----------+     +-----------+     +-----------+     +--------+
|  Push  | --> |  GitHub   | --> |   Test    | --> |   Build   | --> | Deploy |
|  to    |     |  Actions  |     |   Suite   |     |   Docker  |     |        |
|  main  |     |           |     |           |     |   Image   |     |        |
+--------+     +----------+     +-----------+     +-----------+     +--------+
                                     |
                                     v
                              +-------------+
                              |  - pytest   |
                              |  - mypy     |
                              |  - ruff     |
                              |  - security |
                              |    scan     |
                              +-------------+

Branch strategy:
- main:    production deployments (protected, requires PR review)
- staging: staging environment (auto-deploy on merge)
- feature/*: development branches

Pipeline steps:
1. Lint (ruff) + type check (mypy)
2. Unit tests (pytest, ~2 min)
3. Integration tests (pytest with test DB, ~5 min)
4. Security scan (bandit for Python, npm audit for RN)
5. Build Docker image
6. Push to container registry
7. Deploy to staging (auto)
8. Deploy to production (manual approval)
9. Run smoke tests against production
10. Notify Slack channel
```

**Database migrations:**

```
Tool: Alembic (SQLAlchemy migrations)

Process:
1. Developer creates migration: alembic revision --autogenerate -m "add_column_x"
2. Migration reviewed in PR
3. CI runs migration against test DB to verify
4. On deploy: alembic upgrade head runs before app starts
5. Rollback: alembic downgrade -1 (each migration has downgrade path)
```

### 7.5 Monitoring & Alerting

| What | Tool | Alert Threshold |
|------|------|----------------|
| API response time | Prometheus + Grafana (or Datadog) | p95 > 500ms |
| API error rate | Prometheus + Grafana | > 1% 5xx in 5min window |
| Database connections | PostgreSQL metrics | > 80% pool utilization |
| Database query time | pg_stat_statements | Any query > 1s avg |
| Celery queue depth | Redis metrics | > 100 pending tasks |
| Integration sync failures | Custom metrics | > 3 consecutive failures per integration |
| Disk usage | Cloud provider metrics | > 80% |
| SSL certificate expiry | Certbot / cloud alerts | < 14 days |
| User signup rate | Custom metrics | Anomaly detection (sudden spike or drop) |
| Prediction accuracy (aggregate) | Custom dashboard | Weekly average < 0.5 |

**Logging strategy:**

```
Structured JSON logging (python-json-logger):
- INFO: API requests (method, path, status, latency, user_id)
- WARNING: Auth failures, rate limit hits, integration sync retries
- ERROR: Unhandled exceptions, integration permanent failures
- NEVER LOG: Health data values, cycle data, check-in scores, passwords, tokens

Log destination:
- Early stage: Railway built-in logging (30 day retention)
- Growth stage: AWS CloudWatch Logs -> S3 for long-term (anonymized)
```

### 7.6 Cost Estimates

#### Phase 1: MVP (0-1,000 users)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Supabase | Pro | $25 |
| Railway (FastAPI) | Starter | $5-15 |
| Railway (Celery worker) | Starter | $5-10 |
| Railway (Redis) | Starter | $5 |
| Cloudflare R2 | Free tier | $0 |
| Apple Developer Account | Annual | $8.25/mo ($99/yr) |
| Google Play Developer | One-time | $2.08/mo ($25 one-time) |
| Domain + DNS | Cloudflare | $1-2 |
| Email (transactional) | Resend or Postmark free tier | $0 |
| Push notifications | Firebase (free) + APNs (free) | $0 |
| Error tracking | Sentry free tier | $0 |
| **Total** | | **$50-65/mo** |

#### Phase 2: Growth (1,000-10,000 users)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Supabase | Pro (scaled compute) | $50-100 |
| Railway (FastAPI, 2 instances) | Pro | $30-60 |
| Railway (Celery, 2 workers) | Pro | $30-50 |
| Railway (Redis, larger instance) | Pro | $15-25 |
| Cloudflare R2 | Paid | $5-15 |
| Email (transactional) | Resend paid | $20 |
| Sentry | Team | $26 |
| Monitoring (Grafana Cloud) | Free-Pro | $0-50 |
| **Total** | | **$175-350/mo** |

#### Phase 3: Scale (10,000+ users, AWS migration)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| AWS RDS PostgreSQL | db.r6g.large, Multi-AZ | $400-500 |
| AWS ECS Fargate (API) | 2 tasks, 1 vCPU, 2GB | $60-80 |
| AWS ECS Fargate (Workers) | 2 tasks, 2 vCPU, 4GB | $120-160 |
| AWS ElastiCache Redis | cache.t4g.medium | $50-70 |
| AWS S3 | Standard | $10-30 |
| AWS CloudWatch | Logs + metrics | $30-50 |
| AWS SageMaker (ML training) | ml.m5.large, spot | $50-100 |
| AWS WAF | Standard | $10-20 |
| AWS Route 53 + CloudFront | Standard | $10-20 |
| Sentry | Business | $80 |
| **Total** | | **$800-1,100/mo** |

### 7.7 Performance Targets

| Metric | Target (MVP) | Target (Scale) |
|--------|-------------|----------------|
| API response time (p50) | < 100ms | < 50ms |
| API response time (p95) | < 300ms | < 150ms |
| API response time (p99) | < 1s | < 500ms |
| Daily check-in write | < 200ms | < 100ms |
| Pattern detection (background) | < 10s | < 5s |
| Weekly briefing generation | < 30s | < 15s |
| Integration sync (per batch) | < 60s | < 30s |
| App cold start to usable | < 3s | < 2s |
| Uptime | 99.5% | 99.9% |

---

## Appendix A: Onboarding Data Flow

The onboarding sequence is critical for getting enough data to activate intelligence features quickly.

```
Screen 1: Welcome + Name
Screen 2: Select Personas (multi-select from 6 options)
Screen 3: Cycle Tracking opt-in
  - If yes: average cycle length, last period start, hormonal BC
  - If no: skip (can enable later)
Screen 4: Connect Integrations (optional, can skip)
  - Show top 3 relevant based on personas:
    - Sales persona -> HubSpot/Salesforce + Google Calendar
    - Athlete persona -> Apple Health/Garmin/Whoop/Oura/Strava
    - Executive persona -> Google Calendar
    - Mom persona -> Apple Calendar
Screen 5: Set Check-in Reminder Time
Screen 6: First Check-in (immediate)
Screen 7: Dashboard (with "X more check-ins until your first pattern" progress indicator)
```

## Appendix B: Recommended Development Phases

### Phase 1 (Weeks 1-6): Core Loop
- User auth + onboarding
- Daily check-in (create, view, history)
- Manual event logging
- Basic dashboard (averages, streaks)
- Push notification reminders

### Phase 2 (Weeks 7-12): Cycle Intelligence
- Cycle tracking (period logging, phase prediction)
- Baseline prediction engine (rolling averages + cycle-aware)
- Day-of-week pattern detection
- Template-based insights
- Weekly briefing (v1)

### Phase 3 (Weeks 13-18): Integrations + ML
- Google Calendar integration
- Apple Health integration
- One CRM integration (HubSpot)
- Cross-domain pattern detection
- Improved prediction model
- Insight feedback loop

### Phase 4 (Weeks 19-24): Polish + Scale
- Remaining integrations
- LLM-enhanced insights
- Data export
- Performance optimization
- Security audit
- App Store preparation

---

## Appendix C: Key Technical Decisions Log

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| API language | Python (FastAPI) | Node.js (Express/Fastify) | ML pipeline is Python. One language for API + ML reduces complexity. FastAPI async performance is competitive with Node. |
| Database | PostgreSQL + TimescaleDB | PostgreSQL alone, MongoDB, InfluxDB | Relational integrity for core data + time-series optimization for check-ins/events. Single database to manage. |
| Mobile framework | React Native (Expo) | Flutter, SwiftUI + Kotlin | Largest hiring pool. Expo simplifies native integrations. Good enough performance for this app (no gaming/AR). |
| Task queue | Celery + Redis | AWS SQS, RabbitMQ, Dramatiq | Celery is the standard Python choice. Redis serves double duty as cache and broker. |
| Auth | JWT + refresh rotation | Session-based, Firebase Auth | Stateless auth scales better. Refresh rotation provides security against token theft. |
| Encryption | AES-256-GCM (app layer) + TDE (DB layer) | pgcrypto only, Vault | Two layers: TDE protects at rest, app-layer protects against DB-level compromise. AES-GCM provides authenticated encryption. |
| Hosting (early) | Supabase + Railway | Heroku, Fly.io, full AWS | Supabase gives managed Postgres + Auth + Storage for $25/mo. Railway gives simple container hosting. Fastest path to production. |
| Hosting (scale) | AWS | GCP, Azure | Largest ecosystem. SageMaker for ML. Most team members will have AWS experience. |

---

*This document is a living specification. Update it as architectural decisions evolve.*
