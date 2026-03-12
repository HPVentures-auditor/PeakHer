# PeakHer -- MVP Development Roadmap

**Version:** 1.0
**Date:** 2026-03-11
**Status:** Pre-Development
**Classification:** Confidential
**Companion Documents:** PRODUCT_SPEC.md, TECHNICAL_ARCHITECTURE.md

---

## Table of Contents

1. [MVP Definition](#section-1-mvp-definition)
2. [User Stories](#section-2-user-stories)
3. [Development Phases](#section-3-development-phases)
4. [Technical Decisions](#section-4-technical-decisions)
5. [Key Screens](#section-5-key-screens)
6. [Analytics and Success Metrics](#section-6-analytics-and-success-metrics)
7. [Cost Estimate](#section-7-cost-estimate)
8. [Risk Register](#section-8-risk-register)

---

## Section 1: MVP Definition

### Product Summary

PeakHer is a personal performance intelligence platform for women. The MVP validates one core hypothesis: **women who track lightweight daily data (energy, confidence, sleep, stress) alongside their menstrual cycle will discover actionable performance patterns that change how they plan their work and life.**

The MVP is not a period tracker. It is not a mood journal. It is the first tool that correlates biological rhythms with real-world performance across multiple life roles -- sales, fitness, parenting, business, leadership, and creative work -- and surfaces those patterns in plain language.

### What is IN the MVP (v1.0)

The following ten features represent the absolute minimum set required to validate the core value proposition. Each feature is essential; removing any one of them breaks the feedback loop between data collection and pattern delivery.

**1. Onboarding**
- Email/password signup with timezone detection
- Persona selection: user picks 1-6 "hats" (saleswoman, athlete, entrepreneur, mom, executive, creative)
- Optional cycle information: tracking enabled/disabled, average cycle length, last period start date, hormonal birth control status
- Preference setup: check-in reminder time, weekly briefing day
- The onboarding flow must complete in under 90 seconds. Every field beyond email, password, and name is optional and skippable.

**2. Daily Check-in**
- Two required sliders: energy level (1-10) and confidence level (1-10)
- Four optional fields: sleep quality (1-10), stress level (1-10), cycle day (auto-calculated if cycle tracking is enabled), free-text notes
- One check-in per calendar day. Editing allowed same-day or within 24 hours.
- Immediate feedback on submission: current streak count and, once enough data exists, an instant comparison to the user's own historical averages ("Your energy is 2 points above your average for cycle day 12").

**3. Quick-Log Events**
- Tap to log a win, challenge, flow state, or custom event
- Each event requires: title, category tag (sales, fitness, parenting, business, leadership, creative, personal), event type
- Optional fields: description, outcome rating (1-5)
- Events are timestamped and associated with the calendar day for correlation with check-in data

**4. Calendar View**
- Monthly calendar displaying check-in history with color-coded energy/confidence indicators
- Event dots showing logged events by day
- Cycle phase overlay (color bands showing menstrual, follicular, ovulatory, luteal phases) for users with cycle tracking enabled
- Tap any day to see that day's check-in details and events
- Navigation between months

**5. Basic Pattern Dashboard**
- Activates after minimum data threshold (14 check-ins for basic patterns, 2 complete cycles for cycle patterns)
- Energy and confidence trend lines overlaid on a timeline
- Cycle phase background bands on the timeline (if tracking)
- Day-of-week breakdown showing average energy/confidence per weekday
- Plain-language summary of detected patterns at the top of the dashboard

**6. Insight Cards**
- Rule-based insight generation (no ML in v1)
- Three insight types in v1: observations ("Your energy averaged 8.2 on cycle days 10-16 and 5.1 on days 24-28"), predictions ("Tomorrow is historically one of your highest-energy days"), and recommendations ("Consider scheduling important meetings this week -- your follicular phase starts Monday")
- Insight feed sorted by relevance score
- Thumbs up/down feedback on each insight card to train future relevance scoring
- Insights expire (daily insights expire at end of day, weekly insights expire at end of week)

**7. Cycle Tracking**
- Log period start date (tap a button, not navigate a complex flow)
- Automatic cycle length calculation based on consecutive period logs
- Predicted next period start date based on rolling average cycle length
- Estimated phase overlay: menstrual (days 1-5), follicular (days 6-13), ovulatory (days 14-16), luteal (days 17-28) -- adjusted to the user's actual average cycle length
- Phase confidence score that increases with more tracked cycles
- Fully optional. The app works without cycle tracking; it simply has fewer signals to correlate.

**8. Week Ahead View**
- Seven-day forecast showing predicted energy and confidence for each upcoming day
- Prediction model in v1: weighted combination of 7-day rolling average (60% weight without cycle data, 30% weight with cycle data), day-of-week historical average (40% weight without cycle data, 20% weight with cycle data), and cycle-day historical average (50% weight, when available)
- Predicted cycle phase for each day (if tracking)
- One recommended activity per day based on predicted levels and the user's active personas
- "Best day this week" highlight
- Activates after 30 check-ins across 5+ weeks (non-cycle) or 3 complete cycles + 60 check-ins (cycle-aware)

**9. Push Notifications**
- Morning check-in reminder at user-configured time (default 9:00 AM local)
- Weekly briefing notification on user-configured day (default Sunday evening)
- New insight notification when a high-relevance insight is generated
- Streak milestone notifications (7 days, 14 days, 30 days, etc.)
- All notifications are optional and individually configurable

**10. Profile and Settings**
- View and edit active personas (hats)
- Notification preferences (enable/disable each type, set reminder time)
- Cycle tracking settings (enable/disable, update average cycle length)
- Theme selection (light, dark, system)
- Weekly briefing day preference
- Data export (full JSON export of all user data)
- Account deletion (hard delete of all data, GDPR-compliant)
- Privacy policy and terms of service links

### What is Explicitly OUT of v1.0

The following features are intentionally excluded from the MVP. Each exclusion has a reason related to scope control, data dependency, or validation sequencing.

**Phase 2 (Post-MVP validation, estimated Q3 2026)**
- **CRM integration (HubSpot, Salesforce):** Requires OAuth implementation, data mapping, and sync infrastructure. More importantly, the MVP must first prove that manual event logging provides enough signal. If users will not even manually log sales wins, they will not connect their CRM.
- **Fitness tracker / wearable integration (Apple Health, Oura, Whoop, Garmin, Strava):** Same rationale as CRM. Also introduces passive data that could dilute the self-awareness loop that makes the check-in valuable.
- **Calendar integration (Google Calendar, Apple Calendar):** Requires OAuth and event parsing. Adds complexity without validating the core hypothesis.
- **Team mode:** Requires multi-user data sharing, permissions, aggregate dashboards. This is a product expansion, not an MVP feature.
- **Coach sharing:** Requires role-based access, shared views, coach-specific UI. Depends on team mode infrastructure.
- **ML-based pattern detection:** The v1 rule-based system (statistical correlations, cycle-phase analysis, day-of-week patterns) is sufficient for MVP. ML requires more data per user, more infrastructure, and more tuning. The rule-based system is also more interpretable, which builds trust early.

**Phase 3 (Post-product-market-fit, estimated Q4 2026+)**
- **Community features:** Forums, challenges, shared insights. This is a retention and engagement play that depends on having a stable, valued core product.
- **Marketplace:** Coaches, programs, content. Revenue diversification that depends on audience scale.
- **Web dashboard:** The MVP is mobile-only. A web companion is valuable but not required to validate the hypothesis.
- **AI-generated natural language briefings (LLM-enhanced):** The v1 briefings use template-based generation. LLM enhancement adds cost and unpredictability. Templates are sufficient for MVP.

---

## Section 2: User Stories

### Personas Reference

| Persona | Shorthand | Description |
|---------|-----------|-------------|
| Saleswoman | SALES | Quota-carrying sales professional who needs to know when to schedule high-stakes calls and pipeline pushes |
| Athlete | ATHLETE | Competitive or serious recreational athlete who trains around her cycle and wants to optimize performance and recovery |
| Entrepreneur | ENTREPRENEUR | Founder or business owner juggling strategy, execution, fundraising, and operations |
| Mom | MOM | Mother managing family logistics, emotional labor, and her own career or goals simultaneously |
| Executive | EXEC | Senior leader managing teams, board relationships, and strategic decisions under pressure |
| Creative | CREATIVE | Writer, designer, artist, or content creator whose work depends on creative energy and flow states |

---

### Epic 1: Onboarding and Profile

**Story 1.1: Account Creation**
As any user, I want to create an account with my email and password so that my data is saved securely and I can access it across devices.

Acceptance Criteria:
- User can sign up with email, password (minimum 12 characters), and display name
- Timezone is auto-detected from device with option to override
- Email verification is sent upon signup
- User receives access token and refresh token upon successful signup
- Duplicate email addresses are rejected with a clear error message
- Password strength indicator is displayed during entry

**Story 1.2: Persona Selection**
As an entrepreneur who also runs marathons, I want to select multiple personas ("hats") during onboarding so that the app tailors its insights and event categories to my actual life.

Acceptance Criteria:
- User is presented with 6 persona options: saleswoman, athlete, entrepreneur, mom, executive, creative
- User can select 1-6 personas
- At least 1 persona must be selected to proceed
- Personas can be changed later in settings
- Selected personas influence the event categories shown in quick-log and the activity recommendations in Week Ahead
- Visual feedback confirms selection (checkmark, highlight)

**Story 1.3: Cycle Information Setup**
As an athlete who tracks her cycle, I want to optionally enter my cycle information during onboarding so that the app can start correlating my data with cycle phases from day one.

Acceptance Criteria:
- Cycle tracking is presented as optional with a clear "Skip" button
- If enabled, user can enter: average cycle length (15-60 days, default 28), last period start date, hormonal birth control status, cycle regularity (regular, irregular, not tracking)
- If skipped, cycle tracking is disabled but can be enabled later in settings
- The app does not pressure or guilt users who skip cycle tracking
- Clear explanation of why cycle data is valuable ("helps predict your best days") without being clinical or reductive

**Story 1.4: Preference Setup**
As a busy executive, I want to set my check-in reminder time and weekly briefing day during onboarding so that notifications arrive when they are useful, not disruptive.

Acceptance Criteria:
- User can set check-in reminder time (time picker, default 9:00 AM)
- User can select weekly briefing day (day picker, default Sunday)
- Both settings have sensible defaults and can be skipped
- Settings are editable later in Profile and Settings
- The entire onboarding flow (signup through preferences) completes in 4 screens or fewer

---

### Epic 2: Daily Check-in

**Story 2.1: Morning Energy and Confidence Check-in**
As a saleswoman, I want to rate my energy and confidence each morning in under 15 seconds so that I build a data trail without adding friction to my day.

Acceptance Criteria:
- Check-in screen opens with two sliders: energy (1-10) and confidence (1-10)
- Sliders have clear labels and visual feedback (color gradient from red to green)
- Both sliders are required; the submit button is disabled until both are set
- Submission takes a single tap after sliders are positioned
- Target interaction time: under 15 seconds from screen open to submission

**Story 2.2: Optional Daily Details**
As a mom who also trains, I want to optionally log sleep quality, stress level, and notes so that the app has richer data to find patterns -- but only when I have time.

Acceptance Criteria:
- Below the required sliders, optional fields are collapsed or minimized by default
- Optional fields include: sleep quality (1-10), stress level (1-10), free-text notes
- Cycle day is auto-populated if cycle tracking is enabled (user can override)
- Optional fields can be filled or ignored without affecting the check-in submission
- The check-in is valid with only energy and confidence

**Story 2.3: Check-in Streak and Instant Feedback**
As a creative, I want to see my check-in streak and an immediate data comparison after submitting so that I feel motivated to continue and get instant value.

Acceptance Criteria:
- After submission, a confirmation screen shows: current streak count (consecutive days with check-ins), and if sufficient data exists (14+ check-ins), a comparison to historical average ("Your energy is 2 points above your cycle day 12 average")
- Streak milestones (7, 14, 30, 60, 90 days) trigger a celebratory animation
- If no historical comparison is available yet, show an encouraging message about how many more check-ins are needed to unlock patterns

**Story 2.4: Edit Today's Check-in**
As an entrepreneur, I want to update my check-in later in the day (for example, adding an end-of-day rating or notes) so that my data accurately reflects the full day.

Acceptance Criteria:
- If a check-in exists for today, the check-in screen shows the existing values with an "Update" option
- Users can edit check-ins for the current day or the previous day (within 24 hours)
- Edits older than 24 hours are not permitted (data integrity)
- The "overall day rating" field is designed to be filled at end of day (optional)

---

### Epic 3: Event Logging

**Story 3.1: Quick-Log a Win**
As a saleswoman, I want to log a closed deal in two taps so that my wins are tracked and correlated with my energy/confidence data without requiring me to open a CRM.

Acceptance Criteria:
- Quick-log button is accessible from the home screen (floating action button or prominent placement)
- First tap opens the quick-log sheet; second tap selects event type (win, challenge, flow state, custom)
- Title field is required (free text, max 500 characters)
- Category tag is required (sales, fitness, parenting, business, leadership, creative, personal) -- pre-filtered by user's active personas but all categories available
- Description and outcome rating (1-5 stars) are optional
- Event is timestamped automatically
- Submission takes under 10 seconds for the minimum required fields

**Story 3.2: Log a Challenge**
As a mom, I want to log a tough parenting moment so that over time I can see whether my challenging days correlate with specific energy levels or cycle phases.

Acceptance Criteria:
- "Challenge" is a selectable event type alongside "Win"
- Challenges are stored with the same data structure as wins
- The UI does not treat challenges negatively -- the framing is "track it to understand it"
- Challenges contribute to pattern detection the same way wins do

**Story 3.3: Log a Flow State**
As a creative, I want to log when I hit a creative flow state so that I can discover which conditions (energy level, cycle phase, day of week) produce my best creative work.

Acceptance Criteria:
- "Flow State" is a selectable event type
- The event captures the same fields as other events plus auto-captures the current time
- Over time, flow state events are correlated with check-in data in the pattern detection engine

**Story 3.4: View Event History**
As an executive, I want to see a chronological feed of my logged events filtered by category so that I can review my track record in any domain.

Acceptance Criteria:
- Events are displayed in reverse chronological order
- Filter by category (sales, fitness, parenting, etc.)
- Filter by event type (win, challenge, flow state)
- Filter by date range
- Each event card shows: title, category tag, event type, timestamp, outcome rating (if provided)
- Tap to view full event details

---

### Epic 4: Cycle Tracking

**Story 4.1: Log Period Start**
As an athlete, I want to log the start of my period with a single tap so that the app can track my cycle length and predict my phases without me managing a complex calendar.

Acceptance Criteria:
- "Log Period" button is accessible from the calendar view and home screen
- Single tap logs today as period start (with option to select a different date)
- If a current cycle is open (no end date), logging a new period start automatically closes the previous cycle
- The app calculates and displays the previous cycle length
- Updated average cycle length is shown
- Predicted phases for the next cycle are regenerated automatically

**Story 4.2: View Current Cycle Status**
As an entrepreneur, I want to see my current cycle day and predicted phase at a glance so that I can factor it into my planning without digging through menus.

Acceptance Criteria:
- Current cycle day and predicted phase are displayed on the home screen (if cycle tracking is enabled)
- Phase is shown with a name and brief description ("Follicular -- Day 10 of 28: Rising energy, good for strategy and big decisions")
- Phase confidence score is displayed (increases with more tracked cycles)
- Tapping the cycle status opens the full cycle tracking view

**Story 4.3: View Phase Predictions**
As a saleswoman, I want to see my predicted cycle phases for the next 30 days so that I can plan my most important sales activities around my peak performance windows.

Acceptance Criteria:
- A forward-looking phase calendar shows predicted phases for the next 30 days
- Each day shows predicted phase, cycle day number, and confidence score
- Predicted period start date is highlighted
- The prediction improves with each completed cycle (visible confidence score increase)
- Prediction is based on the user's own historical data, not population averages

---

### Epic 5: Pattern Dashboard

**Story 5.1: View Energy and Confidence Trends**
As an executive, I want to see my energy and confidence plotted over time with cycle phase overlays so that I can visually identify my rhythms without reading numbers.

Acceptance Criteria:
- Line chart showing energy (one color) and confidence (another color) over the selected time range
- Cycle phase background bands (four distinct colors for menstrual, follicular, ovulatory, luteal)
- Time range selector: 30 days, 60 days, 90 days
- Tap any data point to see that day's check-in detail
- If cycle tracking is not enabled, phase bands are not shown (chart still works)

**Story 5.2: View Day-of-Week Breakdown**
As a creative, I want to see which days of the week I consistently have the highest energy and confidence so that I can schedule my creative work on those days.

Acceptance Criteria:
- Bar chart showing average energy and confidence per day of week (Monday through Sunday)
- Minimum 3 data points per day before that day's average is displayed
- Highlight the best day and lowest day with labels
- This view works for all users regardless of cycle tracking status

**Story 5.3: View Detected Patterns Summary**
As an athlete, I want to see a plain-language summary of my detected patterns so that I understand my rhythms without interpreting charts.

Acceptance Criteria:
- Top of the dashboard shows 1-3 detected patterns as cards with plain-language descriptions
- Each pattern card shows: description, confidence score, number of data points used
- Patterns are sorted by confidence score (highest first)
- If no patterns are detected yet, show a progress indicator ("12 more check-ins needed to detect your first pattern")
- Patterns update after each new check-in (background processing)

---

### Epic 6: Insights

**Story 6.1: Receive Daily Insight**
As a saleswoman, I want to receive a daily insight about my predicted energy level so that I know whether today is a day to push hard or protect my energy.

Acceptance Criteria:
- After sufficient data (14+ check-ins), a daily insight is generated each morning
- Insight appears on the home screen as a card
- Insight content is specific and data-backed ("Your energy averaged 8.2 on days 10-16 of your cycle. Today is day 12 -- consider scheduling your most important call.")
- Insight references the user's own data, never generic advice

**Story 6.2: Rate Insight Helpfulness**
As an entrepreneur, I want to rate each insight as helpful or not so that the app learns what kinds of insights I actually find valuable.

Acceptance Criteria:
- Each insight card has thumbs-up and thumbs-down buttons
- Tapping either records feedback and visually confirms the selection
- Feedback is stored and used to weight future insight relevance scoring
- Users are not forced to rate insights -- it is always optional

**Story 6.3: View Insight History**
As an executive, I want to scroll through my past insights so that I can revisit patterns I may have forgotten or track how my patterns evolve over time.

Acceptance Criteria:
- Insight history is accessible from the insight feed
- Reverse chronological order with date headers
- Filter by category (sales, fitness, parenting, etc.)
- Filter by type (observation, prediction, recommendation)
- Shows whether the user rated each insight as helpful or not

---

### Epic 7: Week Ahead

**Story 7.1: View Seven-Day Energy Forecast**
As an entrepreneur, I want to see my predicted energy and confidence for each day of the upcoming week so that I can plan my meetings, deep work, and rest days accordingly.

Acceptance Criteria:
- Seven-day view showing predicted energy and predicted confidence per day
- Predicted cycle phase per day (if tracking)
- One recommended activity per day based on predicted levels and active personas
- "Best day this week" is highlighted
- "Lowest day this week" is flagged with a protective recommendation ("Consider lighter meetings and self-care")
- Prediction confidence score is displayed (so users know how much to trust the forecast)

**Story 7.2: View Weekly Briefing**
As a mom who runs a business, I want to receive a weekly summary of last week's data and a preview of the week ahead so that I can plan my week in one sitting.

Acceptance Criteria:
- Weekly briefing is generated on the user's configured day (default Sunday evening)
- Briefing includes: last week's average energy and confidence, check-in completion rate, top events/wins, pattern updates (new or strengthened patterns), and the seven-day forecast
- Briefing is delivered as a push notification and viewable in-app
- Briefing marks as "viewed" when opened

---

### Epic 8: Notifications

**Story 8.1: Morning Check-in Reminder**
As an athlete, I want a push notification each morning reminding me to check in so that I do not forget and break my streak.

Acceptance Criteria:
- Push notification fires at the user's configured reminder time
- Notification text is brief and actionable ("Time to check in -- how are your energy and confidence today?")
- Tapping the notification opens the check-in screen directly
- Notification does not fire if the user has already checked in today
- Notification respects the user's system notification settings

**Story 8.2: Weekly Briefing Notification**
As an executive, I want a notification when my weekly briefing is ready so that I remember to review it and plan my week.

Acceptance Criteria:
- Notification fires on the configured briefing day at 6:00 PM local time (or configurable)
- Notification text: "Your weekly briefing is ready. Tap to see your week ahead."
- Tapping opens the weekly briefing screen

**Story 8.3: Insight Notification**
As a saleswoman, I want to be notified when a high-relevance insight is generated so that I do not miss time-sensitive recommendations.

Acceptance Criteria:
- Push notification fires when an insight with relevance score above 0.8 is generated
- Maximum 1 insight notification per day (to avoid notification fatigue)
- Tapping opens the insight card directly
- User can disable insight notifications independently of other notification types

**Story 8.4: Streak Milestone Notification**
As a creative, I want to be congratulated when I hit check-in streak milestones so that I feel recognized for building the habit.

Acceptance Criteria:
- Milestone notifications fire at: 7 days, 14 days, 30 days, 60 days, 90 days, 180 days, 365 days
- Notification text is celebratory and specific ("14-day streak! Your data is getting stronger -- patterns are forming.")
- Milestone is also displayed in-app on the next check-in

---

## Section 3: Development Phases

### Timeline Overview

| Phase | Name | Weeks | Calendar (Starting Apr 1, 2026) |
|-------|------|-------|---------------------------------|
| 0 | Foundation | Weeks 1-2 | Apr 1 - Apr 14 |
| 1 | Core Tracking | Weeks 3-6 | Apr 15 - May 12 |
| 2 | Intelligence Layer | Weeks 7-10 | May 13 - Jun 9 |
| 3 | Polish and Beta Prep | Weeks 11-14 | Jun 10 - Jul 7 |
| 4 | Beta Launch | Weeks 15-16 | Jul 8 - Jul 21 |

Total: 16 weeks from project start to beta users.

---

### Phase 0: Foundation (Weeks 1-2)

**Goal:** Zero-to-running infrastructure. At the end of Phase 0, a developer can run the app on a simulator, authenticate, and hit the API.

**Week 1: Project Setup**

| Task | Details | Estimate |
|------|---------|----------|
| Initialize React Native + Expo project | `npx create-expo-app peakher`, configure TypeScript, set up directory structure (`/src/screens`, `/src/components`, `/src/services`, `/src/stores`, `/src/utils`, `/src/types`) | 4 hrs |
| Initialize FastAPI backend | Python 3.12+, project structure (`/app/routers`, `/app/services`, `/app/models`, `/app/schemas`, `/app/core`), Pydantic settings, CORS config | 4 hrs |
| Database setup | PostgreSQL 16 on Supabase, run all CREATE TABLE and CREATE INDEX statements from TECHNICAL_ARCHITECTURE.md Section 2, verify with seed data | 6 hrs |
| Supabase Auth integration | Configure Supabase Auth, implement signup/login/refresh/logout flows in FastAPI, JWT validation middleware | 8 hrs |
| Environment configuration | `.env` files for local dev, staging, and production (secrets in Supabase vault or Railway env vars), dotenv loading in both frontend and backend | 2 hrs |

**Week 2: Infrastructure and Design System**

| Task | Details | Estimate |
|------|---------|----------|
| CI/CD pipeline | GitHub Actions: lint (ESLint + Ruff), test (Jest + pytest), type check (TypeScript + mypy), build on every PR. Deploy backend to Railway on merge to main. | 6 hrs |
| Design system / component library | Base components: Button, Slider, Card, TextInput, BottomSheet, Header, TabBar, Typography tokens, color palette (light + dark theme tokens), spacing scale. Use react-native-reanimated for animations. | 12 hrs |
| Navigation setup | React Navigation: bottom tab navigator (Home, Calendar, Insights, Profile), stack navigators within each tab, onboarding stack (shown only if `onboarding_completed === false`) | 4 hrs |
| API client setup | Axios instance with JWT interceptor (auto-refresh on 401), base URL config, TypeScript types matching all Pydantic schemas from TECHNICAL_ARCHITECTURE.md | 4 hrs |
| State management setup | Zustand stores: `useAuthStore`, `useCheckinStore`, `useEventStore`, `useCycleStore`, `useInsightStore`, `useUserStore`. Persist auth tokens with expo-secure-store. | 4 hrs |
| Push notification infrastructure | Configure expo-notifications, request permissions flow, store device push token in backend, Firebase Cloud Messaging setup for Android, APNs for iOS | 6 hrs |

**Phase 0 Deliverables:**
- Running React Native app on iOS simulator and Android emulator
- Authenticated API calls working end-to-end (signup, login, token refresh)
- All database tables created and verified
- CI/CD pipeline passing
- Design system components documented in Storybook or a test screen
- Push notifications sending to test devices

---

### Phase 1: Core Tracking (Weeks 3-6)

**Goal:** A user can onboard, check in daily, log events, track her cycle, and see her data on a calendar. This is the data collection layer -- the app is useful as a journaling tool even before intelligence features arrive.

**Week 3: Onboarding and Authentication**

| Task | Details | Estimate |
|------|---------|----------|
| Onboarding screen 1: Welcome + Signup | Email, password, name fields. Password strength indicator. "Already have an account?" link to login screen. | 6 hrs |
| Onboarding screen 2: Persona Selection | Grid of 6 persona cards with icons. Multi-select. "Pick the hats you wear" header. Minimum 1 required. | 6 hrs |
| Onboarding screen 3: Cycle Info (Optional) | Toggle to enable/disable. If enabled: average cycle length picker, last period date picker, hormonal BC toggle, regularity selector. Clear "Skip" button. | 8 hrs |
| Onboarding screen 4: Preferences + Done | Check-in reminder time picker. Weekly briefing day picker. "Get Started" button that sets `onboarding_completed = true` and navigates to Home. | 4 hrs |
| Backend: onboarding endpoints | `PUT /me/personas`, `PUT /cycle/profile`, `PUT /me/preferences` -- all called sequentially during onboarding. Validate, write to database. | 6 hrs |
| Login screen | Email + password. "Forgot password" link. Token storage in secure store. Auto-navigate to Home on successful login. | 4 hrs |

**Week 4: Daily Check-in and Event Logging**

| Task | Details | Estimate |
|------|---------|----------|
| Daily check-in screen | Two large sliders (energy, confidence) with haptic feedback. Expandable optional section (sleep, stress, notes). Auto-populated cycle day. Submit button with loading state. | 10 hrs |
| Check-in backend | `POST /checkins`, `PUT /checkins/{date}`, `GET /checkins`, `GET /checkins/{date}`, `GET /checkins/streak`. Unique constraint per user per date. Streak calculation logic. | 8 hrs |
| Check-in confirmation flow | Post-submission screen showing streak count, instant insight (if data threshold met), and a motivational message. Auto-dismiss after 3 seconds or tap to dismiss. | 4 hrs |
| Quick-log event screen | Bottom sheet with event type selection (win, challenge, flow state, custom). Title input, category tag picker (filtered by active personas), optional description and outcome rating. | 8 hrs |
| Event backend | `POST /events`, `GET /events`, `GET /events/{id}`, `PUT /events/{id}`, `DELETE /events/{id}`. Cursor-based pagination. Category and date range filters. | 6 hrs |

**Week 5: Cycle Tracking and Calendar**

| Task | Details | Estimate |
|------|---------|----------|
| Cycle tracking: log period | "Log Period" button on home and calendar screens. Creates new `cycle_entry`, closes previous cycle if open. Shows previous cycle length and updated average. | 6 hrs |
| Cycle tracking: phase prediction engine | Backend service that, given a user's cycle history, generates `predicted_phases` records for the next 60 days. Phase estimation algorithm based on average cycle length with standard phase proportions (menstrual ~5 days, follicular ~8 days, ovulatory ~3 days, luteal ~remaining). Regenerates on each new period log. | 10 hrs |
| Cycle tracking: current status display | Home screen widget showing current cycle day, predicted phase name, and phase description. Tap to open cycle detail view. | 4 hrs |
| Calendar view: monthly display | Monthly calendar grid. Each day cell shows: color-coded energy dot, event count badge, cycle phase background color. Navigation arrows for month switching. | 10 hrs |
| Calendar view: day detail | Tap a day to see: check-in values, list of events, cycle day/phase, notes. Displayed as a bottom sheet or detail screen. | 6 hrs |
| Backend: cycle endpoints | `POST /cycle/period`, `PUT /cycle/period/{id}`, `GET /cycle/entries`, `GET /cycle/phases`, `GET /cycle/current`, `PUT /cycle/profile`. Phase prediction service integration. | 8 hrs |

**Week 6: Profile, Settings, and Phase 1 Integration Testing**

| Task | Details | Estimate |
|------|---------|----------|
| Profile and Settings screen | Persona editor, notification preferences (toggles + time picker), cycle tracking settings, theme selector, weekly briefing day picker, data export button, account deletion flow. | 10 hrs |
| Backend: profile endpoints | `GET /me`, `PUT /me`, `PUT /me/personas`, `PUT /me/preferences`, `POST /me/export`, `DELETE /auth/account`. Data export generates JSON file, uploads to S3/R2, returns download link. | 8 hrs |
| Home screen assembly | Assemble the main dashboard: greeting, today's check-in status (done/not done), current cycle status (if tracking), recent events, quick-log button, navigation to all features. | 6 hrs |
| Integration testing | End-to-end testing of all Phase 1 flows: signup through onboarding, daily check-in for 7+ days, event logging, period logging, calendar navigation, profile editing. Fix bugs. | 8 hrs |
| Backend: notification scheduling | Celery beat task for morning check-in reminders. Query users who have not checked in today and whose reminder time has passed. Send push notification via Expo Push API. | 6 hrs |

**Phase 1 Deliverables:**
- Complete onboarding flow (4 screens)
- Daily check-in with streak tracking
- Quick-log events with category tags
- Cycle tracking (period logging, phase prediction, current status)
- Calendar view with check-in history, events, and cycle overlay
- Profile and settings with data export and account deletion
- Morning check-in push notification

---

### Phase 2: Intelligence Layer (Weeks 7-10)

**Goal:** Transform raw data into patterns, insights, and predictions. This is where PeakHer stops being a journal and becomes an intelligence platform.

**Week 7: Pattern Detection Engine**

| Task | Details | Estimate |
|------|---------|----------|
| Preprocessing service | Python service that fetches a user's last 90 days of check-in + event + cycle data, handles missing days (NaN, not interpolated), normalizes scores per-user (z-score relative to user's own mean/std), aligns to user timezone. | 8 hrs |
| Feature engineering service | Compute: day-of-week features, rolling averages (3d, 7d, 14d, 28d), day-over-day deltas, cycle-aligned features (cycle_day_avg_energy, cycle_day_avg_confidence, deviation from cycle-day average), cross-domain features (had_workout, had_win, sleep-energy interaction). | 8 hrs |
| Correlation detector (Strategy 1) | Pearson correlation between variable pairs (sleep-energy, stress-confidence, workout-confidence, workout-energy). Minimum 14 data points, minimum r=0.4, p-value < 0.05. Creates/updates `patterns` records. | 6 hrs |
| Cycle-phase detector (Strategy 2) | Group check-ins by predicted phase. Detect phases where energy or confidence deviates significantly (>0.8 points) from overall average. Detect peak performance windows (both metrics above average >60% of the time on specific cycle days). Requires 2+ complete cycles. | 8 hrs |
| Temporal detector (Strategy 3) | Group check-ins by day-of-week. Detect days where energy deviates significantly (>1.0 points) from overall average. Requires 3+ data points per day across 3+ weeks. | 4 hrs |
| Pattern detection orchestrator | Celery task triggered after each check-in. Runs all applicable detectors based on data availability thresholds. Creates/updates/deactivates patterns. Rate limited to 1 detection run per user per hour. | 6 hrs |

**Week 8: Insight Generation**

| Task | Details | Estimate |
|------|---------|----------|
| Insight template engine | Library of 20-30 insight templates organized by type (observation, prediction, recommendation) and trigger condition. Templates use variables filled from pattern data. Examples in Technical Architecture Section 4. | 10 hrs |
| Insight relevance scoring | Score each generated insight based on: pattern confidence, recency, category match with active personas, whether user has seen similar insights recently (novelty penalty), time sensitivity (cycle-phase insights are more relevant when the phase is imminent). | 6 hrs |
| Insight generation service | After pattern detection runs, evaluate which new insights should be generated. Deduplicate against recent insights. Store in `insights` table with relevance score and expiration. | 6 hrs |
| Insight feed UI | Scrollable feed of insight cards, sorted by relevance score. Each card: insight text, category tag, insight type badge, thumbs-up/down buttons. Pull-to-refresh. Empty state with explanation of when insights start appearing. | 8 hrs |
| Insight feedback backend | `POST /insights/{id}/feedback` stores `was_helpful` boolean. Feedback data is used in relevance scoring (if user consistently rates "recommendation" type insights as unhelpful, reduce their relevance score). | 4 hrs |
| Today's insights endpoint | `GET /insights/today` returns all unexpired insights for today, sorted by relevance. Used on the home screen. | 2 hrs |

**Week 9: Predictions and Week Ahead**

| Task | Details | Estimate |
|------|---------|----------|
| Baseline prediction engine | Weighted combination of: 7-day rolling average, day-of-week historical average, cycle-day historical average (if available). Weights: 30/20/50 with cycle data, 60/40 without. Clamp predictions to 1-10 range. | 8 hrs |
| Activity recommendation engine | Given predicted energy + confidence + user's active personas + predicted cycle phase, select 1-2 recommended activities from a curated activity library. Activity library: 50-100 entries organized by persona x energy-level x confidence-level. | 8 hrs |
| Predictions backend | `GET /predictions/week`, `GET /predictions/{date}`, `GET /predictions/accuracy`, `GET /predictions/best-days`. Accuracy scoring: compare previous predictions to actual check-in values, compute per TECHNICAL_ARCHITECTURE.md formula. | 6 hrs |
| Week Ahead screen | Seven-day card layout. Each day card shows: date, predicted energy (bar or number), predicted confidence (bar or number), predicted cycle phase (if tracking), top recommendation. "Best day" card has special highlight. "Lowest day" card has protective framing. | 10 hrs |
| Prediction accuracy tracking | After each check-in, check if a prediction exists for that date. If so, update `actual_energy` and `actual_confidence` on the prediction record. Computed `accuracy_score` column auto-calculates. | 4 hrs |

**Week 10: Weekly Briefing and Phase 2 Integration**

| Task | Details | Estimate |
|------|---------|----------|
| Weekly briefing generation | Celery beat task: run on each user's configured briefing day at 6:00 PM local time. Aggregate last week's data (average energy/confidence, check-in completion rate, top events, pattern updates). Generate next-week predictions. Store in `weekly_briefings` table. | 10 hrs |
| Weekly briefing screen | Full-screen briefing view with sections: last week summary, highlights, pattern updates, week-ahead forecast with best/lowest days, overall outlook message. "Mark as viewed" on open. | 8 hrs |
| Weekly briefing notification | Push notification when briefing is generated. Tapping opens the briefing screen. | 2 hrs |
| Insight notifications | Push notification for high-relevance insights (relevance_score > 0.8). Max 1 per day. Tapping opens the insight card. | 4 hrs |
| Pattern dashboard screen | Assemble: energy/confidence trend line chart with cycle phase bands, day-of-week bar chart, detected patterns summary cards. Time range selector (30/60/90 days). | 10 hrs |
| Phase 2 integration testing | Seed test accounts with 90 days of varied check-in data. Verify pattern detection produces expected patterns. Verify insight generation produces readable insights. Verify predictions are reasonable. Test edge cases (no cycle tracking, fewer than 14 check-ins, etc.). | 8 hrs |

**Phase 2 Deliverables:**
- Pattern detection engine (3 strategies: correlation, cycle-phase, temporal)
- Insight generation with relevance scoring and feedback
- Week Ahead predictions with activity recommendations
- Weekly briefing generation and display
- Pattern dashboard with trend charts and cycle overlay
- Insight and briefing push notifications

---

### Phase 3: Polish and Beta Prep (Weeks 11-14)

**Goal:** Transform a functional prototype into a beta-ready product. Fix rough edges, handle errors gracefully, optimize performance, and prepare for real users.

**Week 11: UX Polish and Onboarding Tutorial**

| Task | Details | Estimate |
|------|---------|----------|
| Animation and transitions | Smooth screen transitions, slider animation, card entry animations, streak celebration animation, phase transition animations on calendar. Use react-native-reanimated. | 12 hrs |
| Onboarding tutorial / walkthrough | First-time user tour highlighting key features after onboarding: "This is where you check in," "Tap here to log wins," "Your patterns will appear here after 2 weeks." Dismissible, does not repeat. | 8 hrs |
| Empty states | Design and implement empty states for every screen that depends on data: calendar (no check-ins yet), pattern dashboard (not enough data), insight feed (no insights yet), Week Ahead (not enough data for predictions). Each empty state includes clear guidance on what the user needs to do. | 6 hrs |
| Micro-interactions | Haptic feedback on slider interaction. Color transitions as slider value changes. Satisfying submission confirmation. Pull-to-refresh animations. | 4 hrs |
| Typography and spacing audit | Review every screen for consistent typography, spacing, alignment. Ensure accessibility (minimum 16px body text, sufficient contrast ratios, VoiceOver labels). | 4 hrs |

**Week 12: Error Handling, Edge Cases, and Offline Support**

| Task | Details | Estimate |
|------|---------|----------|
| Error handling: network errors | Graceful handling of offline state, API timeouts, server errors. Retry logic with exponential backoff. User-facing error messages that are helpful, not technical. | 8 hrs |
| Error handling: validation errors | Client-side validation matching all Pydantic constraints. Inline error messages on form fields. Prevent submission of invalid data. | 4 hrs |
| Edge cases: cycle tracking | Handle: irregular cycles (>45 days), very short cycles (<21 days), missed period logs, hormonal BC users (no ovulatory phase prediction), users who stop tracking mid-cycle, users who enable tracking after having check-in data. | 8 hrs |
| Edge cases: check-in | Handle: timezone changes (travel), check-in at 11:59 PM, editing yesterday's check-in, device clock skew. | 4 hrs |
| Offline check-in queue | Allow check-ins and event logs when offline. Queue locally, sync when connection is restored. Conflict resolution: server wins if a check-in for that date already exists on server. | 8 hrs |
| Backend error handling | Standardize all error responses to the format in TECHNICAL_ARCHITECTURE.md Section 3.1. Custom exception classes. Global exception handler. Structured logging. | 6 hrs |

**Week 13: Performance, Security, and Analytics**

| Task | Details | Estimate |
|------|---------|----------|
| Performance: app startup | Target: cold start under 2 seconds. Optimize: lazy-load non-critical screens, minimize initial API calls (batch into single `/me/dashboard` endpoint if needed), cache critical data with Zustand persist. | 6 hrs |
| Performance: API response times | Target: p95 under 300ms for all read endpoints. Add Redis caching for: current cycle status, today's prediction, today's insights, user preferences. Cache invalidation on relevant writes. | 6 hrs |
| Performance: chart rendering | Optimize chart rendering for 90-day datasets. Use Victory Native or react-native-chart-kit with memoization. Test on low-end devices. | 4 hrs |
| Security audit | Review: JWT token storage (secure store, not AsyncStorage), API rate limiting (100 req/min per user, 10 req/min for auth endpoints), input sanitization, SQL injection prevention (parameterized queries via SQLAlchemy), CORS configuration, HTTPS enforcement. | 8 hrs |
| Privacy review | Verify: all health data fields encrypted at rest (pgcrypto), data export includes all user data (GDPR compliance), account deletion hard-deletes all records, no analytics contain PII, privacy policy accurately describes data handling. | 6 hrs |
| Analytics integration (Mixpanel) | Install Mixpanel SDK. Instrument all events listed in Section 6. Verify events fire correctly. Set up user properties (personas, subscription tier, cycle tracking enabled). | 8 hrs |

**Week 14: Beta Infrastructure and Final QA**

| Task | Details | Estimate |
|------|---------|----------|
| TestFlight setup (iOS) | Configure App Store Connect, create beta testing group, upload first build, configure external testing. | 4 hrs |
| Google Play Beta setup (Android) | Configure Google Play Console, create internal testing track, upload AAB, configure testing. | 4 hrs |
| Beta feedback system | In-app feedback button (shake to report, or menu item). Sends: screenshot, device info, app version, user ID (anonymized), free-text description. Backend stores feedback with metadata. | 8 hrs |
| Full QA pass | Test every flow on: iPhone 14 (or equivalent), iPhone SE (small screen), Pixel 7 (or equivalent), Samsung Galaxy A (budget Android). Test: onboarding, 7 days of check-ins, event logging, period logging, calendar navigation, pattern dashboard, insights, Week Ahead, settings changes, notification delivery, offline mode, data export, account deletion. | 16 hrs |
| Bug fixes | Buffer for bugs found during QA. | 12 hrs |
| App Store metadata preparation | App name, subtitle, description, screenshots, category selection, privacy nutrition labels, age rating. Do NOT submit to App Store review yet (beta only via TestFlight). | 4 hrs |

**Phase 3 Deliverables:**
- Polished UI with animations and micro-interactions
- First-time user tutorial
- Complete empty state designs
- Robust error handling (online and offline)
- Performance targets met (2s cold start, 300ms API p95)
- Security and privacy audit completed
- Analytics instrumented
- TestFlight and Google Play Beta builds ready
- In-app feedback system operational

---

### Phase 4: Beta Launch (Weeks 15-16)

**Goal:** Get the app into the hands of 100 real women, collect feedback, and iterate before public launch.

**Week 15: Beta Onboarding**

| Task | Details | Estimate |
|------|---------|----------|
| Beta user recruitment | Recruit 100 women from target personas: 20 saleswomen, 20 athletes, 20 entrepreneurs, 20 moms, 10 executives, 10 creatives. Source from: personal network, social media, women's professional groups, fitness communities. | Ongoing |
| Beta invitation system | Email invitation with TestFlight/Google Play Beta link, unique invite code, welcome guide explaining what to expect and how to give feedback. | 6 hrs |
| Beta welcome email sequence | Day 0: Welcome + setup guide. Day 3: "How is it going?" check-in. Day 7: "Your first week" summary. Day 14: "Patterns are forming" anticipation builder. Day 30: Full feedback survey. | 4 hrs |
| Monitoring dashboard | Simple admin view (can be a Supabase dashboard or Retool): active users, daily check-in counts, error rates, API response times, crash reports. | 6 hrs |

**Week 16: Feedback and Iteration**

| Task | Details | Estimate |
|------|---------|----------|
| Feedback collection | Monitor: in-app feedback reports, beta tester email thread/Slack channel, app store beta reviews, analytics data (funnel drop-offs, feature usage). | Ongoing |
| Bug triage | Prioritize bugs by: crash (P0), data loss (P0), broken feature (P1), UX issue (P2), cosmetic (P3). Fix all P0 and P1 within 48 hours. | Ongoing |
| Rapid iteration | Ship 2-3 beta updates during Week 16 based on feedback. Focus on: check-in flow friction, insight quality, notification timing, onboarding clarity. | Ongoing |
| Data validation | Verify with real data: Are patterns being detected correctly? Are insights making sense? Are predictions reasonable? If not, tune thresholds and templates. | 8 hrs |
| Go/no-go assessment | At end of Week 16, evaluate against MVP Success Criteria (Section 6). Decide: iterate further in beta, proceed to public launch, or pivot. | -- |

**Phase 4 Deliverables:**
- 100 beta users onboarded
- Feedback collection system operational
- 2-3 iteration cycles completed
- Data-informed assessment of MVP success criteria
- Decision on next phase (public launch, extended beta, or pivot)

---

## Section 4: Technical Decisions

### Decision 1: Mobile Framework -- React Native + Expo

**Choice:** React Native with Expo (managed workflow)

**Alternatives Considered:**
- Flutter (Dart)
- Native iOS (Swift) + Native Android (Kotlin)
- Progressive Web App (PWA)

**Why React Native + Expo:**
- **Cross-platform from day one.** PeakHer needs to be on both iOS and Android to reach the target audience. Writing native code for both platforms doubles the development effort for an MVP.
- **Expo simplifies the hard parts.** Push notifications (expo-notifications), secure storage (expo-secure-store), app updates (expo-updates for OTA), and build/deploy (EAS Build) are handled by Expo's managed infrastructure. This eliminates weeks of native configuration.
- **JavaScript/TypeScript ecosystem.** Larger hiring pool than Dart (Flutter) or native specialists. Most frontend developers can contribute immediately.
- **Expo SDK covers our needs.** Health data access (expo-health, or direct Apple HealthKit bridge for Phase 2), notifications, secure storage, camera (if needed), biometrics -- all available as Expo modules.
- **Performance is sufficient.** PeakHer is a data entry and data visualization app, not a game or real-time collaboration tool. React Native performance is more than adequate for sliders, charts, and scrollable feeds.

**Why not Flutter:** Dart ecosystem is smaller. Fewer charting libraries. Smaller pool of available developers. Flutter is excellent but does not offer a decisive advantage for this use case.

**Why not native:** Two codebases, two sets of bugs, two deployment pipelines. Not justified for an MVP where speed of iteration matters more than platform-specific polish.

**Why not PWA:** Push notifications on iOS are limited for PWAs. No access to HealthKit. App Store presence matters for credibility with this audience.

---

### Decision 2: Backend -- FastAPI (Python)

**Choice:** FastAPI with Python 3.12+

**Alternatives Considered:**
- Node.js with Express or NestJS
- Go (Gin or Fiber)
- Ruby on Rails

**Why FastAPI:**
- **Python is required for the intelligence layer.** Pattern detection, statistical analysis, and eventually ML all depend on Python's data science ecosystem (NumPy, pandas, SciPy, scikit-learn, statsmodels). If the backend is in Node.js, we either rewrite the intelligence layer in JavaScript (poor library support) or maintain two separate services (operational overhead). FastAPI keeps everything in one language.
- **FastAPI is fast.** Built on Starlette (ASGI), it handles async I/O natively. Benchmarks show FastAPI significantly outperforming Flask and Django for API workloads.
- **Pydantic validation.** Request and response schemas are validated automatically. Type hints generate OpenAPI documentation. This eliminates an entire category of bugs and makes the frontend developer's life easier (auto-generated TypeScript types from OpenAPI spec).
- **Async support.** Database queries, external API calls, and Celery task dispatch can all be async, keeping the API responsive under load.

**Why not Node.js/Express:** Great for CRUD APIs, but the intelligence layer requires Python. Maintaining a polyglot backend (Node for API + Python for ML) adds operational complexity that is not justified at MVP scale.

**Why not Go:** Excellent performance, but the data science library ecosystem is immature compared to Python. Pattern detection and statistical analysis would require significant custom implementation.

**Why not Rails:** Ruby's data science ecosystem is even thinner than Go's. Rails is excellent for CRUD-heavy web apps but not a natural fit for a data intelligence backend.

---

### Decision 3: Database -- PostgreSQL 16 + Supabase

**Choice:** PostgreSQL 16 hosted on Supabase, with optional TimescaleDB extension for time-series optimization at scale

**Alternatives Considered:**
- Firebase (Firestore)
- DynamoDB
- MongoDB
- PlanetScale (MySQL)

**Why PostgreSQL + Supabase:**
- **Relational data model is the right fit.** PeakHer's data is highly relational: users have personas, check-ins, events, cycle entries, patterns, insights, and predictions -- all with clear foreign key relationships. A document database (Firestore, MongoDB) would require denormalization and lose referential integrity.
- **TimescaleDB extension.** When check-in volume grows, TimescaleDB provides time-series optimizations (compression, continuous aggregates) without migrating to a separate database. This is a free upgrade path.
- **pgcrypto for field-level encryption.** Health data (energy levels, cycle data) must be encrypted at rest. pgcrypto handles this at the database level, which is simpler and more secure than application-layer encryption.
- **Supabase provides managed Postgres + Auth + Realtime + Storage.** One vendor for database, authentication, file storage (data exports), and real-time subscriptions (future use). Generous free tier (500MB database, 50,000 MAU on auth).
- **SQL is the right query language for analytics.** Pattern detection queries involve aggregations, window functions, GROUP BY, and joins. SQL handles these natively. Writing equivalent queries in a document database requires application-layer aggregation.

**Why not Firebase/Firestore:** Document model is a poor fit for relational data. No field-level encryption. Vendor lock-in with Google. Pricing becomes unpredictable at scale (per-read pricing).

**Why not DynamoDB:** Excellent for simple key-value workloads. Poor fit for the complex queries required by pattern detection (joins, aggregations, window functions). Requires denormalization that complicates the data model.

**Why not MongoDB:** Could work, but loses the benefits of relational integrity and SQL analytics. No equivalent to TimescaleDB for time-series optimization.

---

### Decision 4: Auth -- Supabase Auth

**Choice:** Supabase Auth (built on GoTrue)

**Alternatives Considered:**
- Firebase Auth
- Auth0
- Custom JWT implementation

**Why Supabase Auth:**
- **Bundled with our database host.** Since we are already using Supabase for PostgreSQL, adding Supabase Auth adds zero additional vendor relationships. User management, JWT issuance, email verification, and password reset are all handled.
- **PKCE flow for mobile.** Supabase Auth supports the PKCE (Proof Key for Code Exchange) OAuth flow, which is the recommended standard for mobile apps (no client secret stored on device).
- **50,000 MAU free tier.** More than sufficient for MVP and early growth.
- **Row Level Security (RLS) integration.** Supabase Auth JWTs work natively with PostgreSQL Row Level Security, providing an additional layer of data isolation at the database level.

**Why not Firebase Auth:** Would work technically but introduces a second vendor (Google) alongside Supabase. Firebase Auth does not integrate with PostgreSQL RLS.

**Why not Auth0:** Excellent product but expensive at scale ($23/month for 1,000 MAU). Overkill for MVP. Can migrate to Auth0 later if enterprise SSO is needed.

**Why not custom JWT:** Building auth from scratch is a security liability. Token issuance, refresh rotation, PKCE, email verification, password hashing (bcrypt/argon2), rate limiting on auth endpoints -- all of this is solved by Supabase Auth.

---

### Decision 5: Pattern Detection v1 -- Statistical Rules

**Choice:** Rule-based pattern detection using statistical methods (Pearson correlation, phase-grouped means, day-of-week analysis)

**Alternatives Considered:**
- Machine learning from day one (scikit-learn, TensorFlow, PyTorch)
- LLM-based analysis (GPT-4 or Claude analyzing user data)

**Why statistical rules for v1:**
- **Works with small datasets.** ML models need hundreds or thousands of data points per user to train reliably. A rule-based system produces useful patterns with as few as 14 check-ins. Since the MVP's entire value proposition depends on delivering patterns early, ML would create a "cold start" problem that kills the user experience.
- **Interpretable.** When the app says "Your energy is 2.1 points higher during the follicular phase," the user can understand and verify that claim. ML black-box outputs ("we predict your energy will be 7.3 tomorrow") are harder to trust, especially for a new product.
- **Cheaper to run.** No GPU requirements, no model training costs, no model hosting. Statistical rules run in milliseconds on a single CPU.
- **Easier to debug.** When a pattern is wrong, a developer can trace the exact calculation. ML model debugging requires specialized expertise.
- **Clear upgrade path.** The rule-based system establishes the data pipeline (collection, preprocessing, feature engineering) that ML will later consume. Nothing is wasted.

**Why not ML from day one:** Cold start problem (insufficient per-user data), higher infrastructure cost, harder to debug, lower interpretability. ML is the right choice for Phase 2+ once users have 90+ days of data.

**Why not LLM analysis:** Expensive per-user (API call costs), non-deterministic outputs (hard to validate at scale), latency (seconds vs. milliseconds), and privacy concerns (sending health data to third-party LLM APIs).

---

### Decision 6: Hosting -- Supabase + Railway

**Choice:** Supabase for database/auth/storage, Railway for FastAPI backend and Celery workers

**Alternatives Considered:**
- AWS (ECS, RDS, Lambda)
- Google Cloud Platform (Cloud Run, Cloud SQL)
- Fly.io
- Render

**Why Supabase + Railway:**
- **Supabase** is already chosen for database and auth. Adding storage (data exports) and edge functions (future webhooks) keeps the vendor count low.
- **Railway** provides simple deployment of Dockerized Python apps. One-click deploy from GitHub, automatic scaling, built-in logging, and a generous free tier ($5/month credit). Supports Celery workers as separate services on the same project.
- **Combined cost at MVP scale: $0-25/month.** Supabase free tier (500MB database, 1GB storage, 50K MAU auth) + Railway free tier ($5 credit) covers 0-100 beta users comfortably.
- **No DevOps overhead.** Neither Supabase nor Railway requires Terraform, CloudFormation, or Kubernetes knowledge. A solo developer or small team can deploy and manage the infrastructure.

**Why not AWS:** Powerful but operationally complex. ECS, RDS, Lambda, SQS, SNS, CloudWatch, IAM -- each requires configuration, monitoring, and cost management. Overkill for a 0-1,000 user MVP. AWS is the right choice when PeakHer reaches 10,000+ users and needs granular control.

**Why not GCP:** Similar to AWS in complexity. Cloud Run is simpler but the overall GCP ecosystem has a steep learning curve for a small team.

**Why not Fly.io/Render:** Both are strong alternatives to Railway. Fly.io is excellent for globally distributed deployments (not needed for MVP). Render is comparable to Railway; either would work.

---

### Decision 7: State Management -- Zustand

**Choice:** Zustand for client-side state management

**Alternatives Considered:**
- Redux (+ Redux Toolkit)
- MobX
- React Context + useReducer
- Jotai / Recoil

**Why Zustand:**
- **Minimal boilerplate.** A Zustand store is 10-20 lines of code. Equivalent Redux setup (slice, reducers, selectors, thunks) is 50-100 lines. For an MVP where speed matters, less boilerplate means faster development.
- **No provider wrapping.** Zustand stores are consumed with a single hook (`useStore`), no Provider component needed at the root. This simplifies the component tree.
- **Built-in persistence.** Zustand's `persist` middleware integrates with AsyncStorage (or expo-secure-store for sensitive data like tokens) with minimal configuration.
- **TypeScript-first.** Full type inference without extra type annotations. Zustand infers store types from the initial state and actions.
- **Sufficient for our complexity level.** PeakHer's client state is straightforward: auth tokens, current user profile, today's check-in, recent events, cached insights. There are no complex derived states or deeply nested state trees that would justify Redux's strictness.

**Why not Redux:** Excellent for large teams and complex state, but the boilerplate-to-value ratio is poor for a small team building an MVP. Redux Toolkit reduces boilerplate but still requires more ceremony than Zustand.

**Why not MobX:** Proxy-based reactivity is powerful but introduces a different mental model (observables, actions, computed). Zustand is closer to standard React patterns (hooks, immutable updates).

**Why not Context + useReducer:** Works for small state but causes unnecessary re-renders when context values change. No built-in persistence. Becomes unwieldy with multiple unrelated state slices.

---

### Decision 8: Charts and Visualization -- Victory Native

**Choice:** Victory Native (by Formidable Labs)

**Alternatives Considered:**
- react-native-chart-kit
- react-native-svg-charts (archived)
- react-native-gifted-charts
- Custom SVG with react-native-svg

**Why Victory Native:**
- **Composable API.** Victory allows layering multiple chart types (line chart for energy, area chart for confidence, background bands for cycle phases) on the same coordinate system. This is essential for the pattern dashboard, which overlays multiple data series.
- **Animation support.** Victory has built-in animation for data transitions, which makes the dashboard feel responsive when switching time ranges.
- **Customization depth.** Every visual element (axes, labels, tooltips, colors, stroke widths) is customizable. PeakHer's charts need to match the design system exactly.
- **Active maintenance.** Victory is maintained by Formidable Labs and is one of the most widely used React Native charting libraries.
- **Shared API with Victory (web).** If PeakHer adds a web dashboard in Phase 3, the same chart code can be reused with Victory (web version) with minimal changes.

**Why not react-native-chart-kit:** Simpler API but less customizable. Does not support overlaying multiple chart types on the same axes. Limited animation support. Adequate for simple dashboards but not for PeakHer's layered visualizations.

**Why not custom SVG:** Maximum control but requires building every chart primitive (axes, scales, tooltips, legends, animations) from scratch. Development time is prohibitive for MVP.

---

## Section 5: Key Screens (Wireframe Descriptions)

### Screen 1: Onboarding Flow (4 Steps)

**Step 1: Welcome and Signup**

Layout:
- Top third: PeakHer logo and tagline ("Know your rhythm. Own your performance.")
- Middle: Signup form with three fields -- Name, Email, Password
- Password field: show/hide toggle, strength indicator bar beneath
- Bottom: "Create Account" primary button (full width), followed by "Already have an account? Log in" link

User Interactions:
- Type name, email, password
- Tap "Create Account" to submit
- Tap "Log in" to navigate to login screen
- Inline validation on each field (email format, password minimum length)

Data Displayed: None (first interaction)

Navigation: On success, proceeds to Step 2. On "Log in" tap, navigates to Login screen.

**Step 2: Pick Your Hats (Persona Selection)**

Layout:
- Header: "What hats do you wear?" with subtext "Select all that apply"
- 2x3 grid of persona cards, each with: icon, label (Saleswoman, Athlete, Entrepreneur, Mom, Executive, Creative), and a brief tagline
- Selected cards show a checkmark overlay and highlighted border
- Bottom: "Continue" button (disabled until at least 1 is selected), skip is not available for this step

User Interactions:
- Tap persona cards to toggle selection (multi-select)
- Tap "Continue" to proceed

Data Displayed: 6 persona options

Navigation: Proceeds to Step 3.

**Step 3: Cycle Tracking (Optional)**

Layout:
- Header: "Track your cycle?" with subtext explaining the value ("Unlock the most powerful patterns by adding cycle data")
- Toggle switch: "Enable Cycle Tracking" (default off)
- When enabled, form fields appear with animation: Average cycle length (number picker, default 28), Last period start date (date picker), Hormonal birth control (yes/no toggle), Regularity (regular/irregular picker)
- Bottom: "Continue" button, "Skip for now" text link beneath

User Interactions:
- Toggle cycle tracking on/off
- Fill in cycle fields (all optional within the section)
- Tap "Continue" or "Skip for now"

Data Displayed: Explanation of cycle tracking benefits

Navigation: Proceeds to Step 4 regardless of whether cycle tracking is enabled.

**Step 4: Preferences and Done**

Layout:
- Header: "Set your reminders"
- Check-in reminder time: time picker (default 9:00 AM)
- Weekly briefing day: day-of-week picker (default Sunday)
- Bottom: "Get Started" primary button with celebratory styling

User Interactions:
- Adjust reminder time
- Select briefing day
- Tap "Get Started"

Data Displayed: Default preference values

Navigation: Navigates to Home screen. Sets `onboarding_completed = true`. This step is not shown again.

---

### Screen 2: Home / Dashboard

Layout:
- Top: Greeting ("Good morning, Sarah") with current date
- Section 1 -- Today's Status: Check-in card showing either "Check in now" (if not done) or today's energy/confidence values (if done). Current cycle day and phase (if tracking), displayed as a small badge.
- Section 2 -- Today's Insights: 1-2 insight cards (if available). Each card: insight text, category tag, thumbs-up/down. If no insights yet, show "Insights unlock after 14 check-ins" with progress bar.
- Section 3 -- Recent Events: Last 3 logged events, each showing title, category, and timestamp. "See all" link to full event history.
- Floating Action Button (FAB): "+" button in bottom-right corner for quick-log

User Interactions:
- Tap check-in card to open Daily Check-in screen
- Tap insight cards to expand/rate
- Tap an event to view details
- Tap FAB to open Quick Log
- Pull down to refresh all data

Data Displayed:
- Today's check-in status (done/not done, values if done)
- Current cycle day and phase (if tracking)
- Today's insights (0-2 cards)
- Last 3 events
- Check-in streak count

Navigation: Bottom tab bar with 4 tabs: Home (current), Calendar, Insights, Profile. Tapping check-in card navigates to Check-in screen. FAB opens Quick Log bottom sheet.

---

### Screen 3: Daily Check-in

Layout:
- Header: "How are you today?" with current date
- Energy slider: large horizontal slider (1-10) with label "Energy" and numeric display. Color gradient background (red at 1, orange at 5, green at 10).
- Confidence slider: identical format, label "Confidence"
- Expandable section: "Add more details" collapsible area containing: Sleep quality slider (1-10), Stress level slider (1-10), Cycle day (auto-populated, editable), Notes text input (multiline, max 500 chars)
- Submit button: "Check In" (primary, full width). Disabled until both required sliders are set.

User Interactions:
- Drag energy slider to set value (haptic feedback on value change)
- Drag confidence slider to set value
- Optionally expand details section and fill additional fields
- Tap "Check In" to submit
- If editing an existing check-in: sliders are pre-populated, button says "Update"

Data Displayed:
- Current slider values (large numeric display)
- Auto-calculated cycle day (if tracking)
- Previous check-in values for comparison (subtle text: "Yesterday: Energy 7, Confidence 8")

Navigation: Back button returns to Home. After submission, shows Confirmation screen (streak, instant insight) then auto-navigates to Home after 3 seconds.

---

### Screen 4: Quick Log

Layout:
- Bottom sheet (slides up from bottom, 70% screen height)
- Header: "Log an event"
- Event type selector: 4 tappable pills in a row -- Win, Challenge, Flow State, Custom. One must be selected.
- Title input: single line text field, required
- Category selector: horizontal scrollable chips -- Sales, Fitness, Parenting, Business, Leadership, Creative, Personal. Chips matching user's active personas are shown first and highlighted.
- Expandable section: Description (multiline text), Outcome Rating (1-5 stars)
- Submit button: "Log It" (primary, full width)

User Interactions:
- Tap event type pill to select
- Type title
- Tap category chip to select
- Optionally expand for description and rating
- Tap "Log It" to submit
- Swipe down or tap outside to dismiss

Data Displayed:
- Event type options
- Category options (persona-filtered)

Navigation: Bottom sheet dismisses on submit or swipe-down, returning to the previous screen.

---

### Screen 5: Calendar View

Layout:
- Header: Month and year with left/right navigation arrows
- Calendar grid: 7 columns (Mon-Sun), 5-6 rows per month
- Each day cell contains:
  - Background color band indicating cycle phase (if tracking): light red (menstrual), light green (follicular), light yellow (ovulatory), light blue (luteal)
  - Energy indicator: small colored dot (green if >= 7, yellow if 4-6, red if <= 3). No dot if no check-in.
  - Event count badge: small number in corner if events were logged that day
- Today is highlighted with a ring/border
- Below calendar: day detail panel (visible when a day is selected)

User Interactions:
- Tap left/right arrows to navigate months
- Tap any day to select it and show day detail panel below
- Swipe left/right to navigate months
- Tap "Log Period" button (visible in calendar header area) to log a period start

Data Displayed:
- Check-in energy levels (as colored dots)
- Event counts per day
- Cycle phase bands (if tracking)
- Selected day detail: check-in values, events list, cycle day/phase, notes

Navigation: Part of the bottom tab bar. Tapping a day with a check-in can navigate to a read-only check-in detail view.

---

### Screen 6: Pattern Dashboard

Layout:
- Header: "Your Patterns" with time range selector (30d / 60d / 90d pills)
- Section 1 -- Pattern Summary Cards: 1-3 horizontal scrollable cards, each showing a detected pattern in plain language with confidence score and data points count. If no patterns detected: progress indicator ("7 more check-ins to unlock your first pattern").
- Section 2 -- Trend Chart: Line chart with two lines (energy in one color, confidence in another). X-axis: dates. Y-axis: 1-10 scale. Background bands showing cycle phases (if tracking). Tap a data point to see that day's values.
- Section 3 -- Day-of-Week Breakdown: Grouped bar chart. X-axis: Mon-Sun. Y-axis: average value. Two bars per day (energy, confidence). Best day and lowest day labeled.

User Interactions:
- Tap time range pills to change data window (chart and patterns refresh)
- Scroll horizontally through pattern cards
- Tap a data point on the trend chart to see day details
- Tap a pattern card to see more detail (the data points behind the pattern)

Data Displayed:
- Detected patterns (type, description, confidence, data points)
- Energy and confidence time series
- Cycle phase overlay
- Day-of-week averages

Navigation: Accessible from the Insights tab or a "View Patterns" link on the Home screen. Back button returns to previous screen.

---

### Screen 7: Week Ahead

Layout:
- Header: "Your Week Ahead" with the date range (e.g., "Mar 12-18, 2026")
- 7 day cards stacked vertically, each containing:
  - Day name and date
  - Predicted energy (horizontal bar, color-coded, with number)
  - Predicted confidence (horizontal bar, color-coded, with number)
  - Predicted cycle phase and cycle day (if tracking)
  - Top recommended activity (one line of text with category tag)
- "Best Day" card has a special highlight (gold border or star icon)
- "Lowest Day" card has a gentle flag (blue border or shield icon) with protective recommendation
- Bottom: Prediction confidence disclaimer ("Based on [N] days of your data. Predictions improve over time.")

User Interactions:
- Scroll through day cards
- Tap a day card to expand and see additional recommendations
- Tap "Learn how predictions work" to see an explanation modal

Data Displayed:
- Predicted energy and confidence for 7 days
- Predicted cycle phases
- Activity recommendations
- Prediction confidence score
- Best and lowest day highlights

Navigation: Accessible from the Home screen ("See your week ahead" link) or from the Insights tab. Back button returns to previous screen.

---

### Screen 8: Insight Feed

Layout:
- Header: "Insights" with filter options (All, Observations, Predictions, Recommendations)
- Scrollable vertical feed of insight cards
- Each card contains:
  - Insight text (2-4 lines, plain language)
  - Category tag (e.g., "Sales", "Fitness")
  - Insight type badge (Observation / Prediction / Recommendation)
  - Thumbs-up and thumbs-down buttons
  - Timestamp ("Today", "Yesterday", "Mar 8")
- Empty state (fewer than 14 check-ins): illustration, "Your insights are brewing" header, "Complete [N] more check-ins to unlock your first insight" with progress bar
- Pull-to-refresh

User Interactions:
- Scroll through insights
- Tap filter pills to filter by type
- Tap thumbs-up or thumbs-down on any card
- Pull down to refresh
- Tap "View Patterns" button (in header or below feed) to navigate to Pattern Dashboard

Data Displayed:
- Active insights sorted by relevance
- Category and type for each
- Feedback status (rated or not)
- Progress toward first insight (if not yet unlocked)

Navigation: Part of the bottom tab bar (Insights tab). "View Patterns" navigates to Pattern Dashboard. "Week Ahead" link navigates to Week Ahead screen.

---

### Screen 9: Profile and Settings

Layout:
- Header: "Settings" with user name and email
- Section 1 -- Your Hats: Grid of persona chips showing active personas. "Edit" button opens persona editor (same UI as onboarding Step 2).
- Section 2 -- Notifications: Toggle switches for each notification type (Check-in reminder, Weekly briefing, Insight alerts, Streak milestones). Reminder time picker (visible when check-in reminder is enabled). Briefing day picker (visible when weekly briefing is enabled).
- Section 3 -- Cycle Tracking: Toggle to enable/disable. If enabled: average cycle length, last period date, hormonal BC, regularity. Same fields as onboarding Step 3.
- Section 4 -- Appearance: Theme selector (Light / Dark / System).
- Section 5 -- Data and Privacy: "Export My Data" button (triggers async export, shows download link when ready). "Delete My Account" button (red, requires password confirmation and "DELETE MY ACCOUNT" typed confirmation). Links to Privacy Policy and Terms of Service.
- Section 6 -- About: App version, "Send Feedback" button, "Rate the App" link.

User Interactions:
- Tap "Edit" on personas to modify selection
- Toggle notification switches
- Adjust notification times
- Toggle and configure cycle tracking
- Select theme
- Tap "Export My Data"
- Tap "Delete My Account" (with double confirmation)
- Tap feedback/rating links

Data Displayed:
- Current persona selections
- Current notification preferences
- Current cycle tracking configuration
- App version

Navigation: Part of the bottom tab bar (Profile tab). Export triggers async process and shows status. Account deletion logs user out and returns to Welcome screen.

---

## Section 6: Analytics and Success Metrics

### MVP Success Criteria

These are the quantitative thresholds that determine whether to proceed to Phase 2 investment. All metrics are measured at the 60-day mark after beta launch (approximately Week 24 from project start).

| Metric | Target | How Measured | Rationale |
|--------|--------|-------------|-----------|
| DAU/MAU Ratio | > 30% | Mixpanel: unique users who open app on a given day / unique users who opened app in last 30 days | 30% is "good" for a utility app. Below 20% suggests the app is not habit-forming. |
| Daily Check-in Completion | > 60% of active days | Backend: days with check-ins / days since first check-in, for users active in last 7 days | The entire value proposition depends on consistent check-ins. Below 50% means the product fails. |
| 30-Day Retention | > 35% | Mixpanel: users who opened app on day 30 / users who completed onboarding 30 days ago | Industry benchmark for health/wellness apps is 25-35%. PeakHer should beat average due to the anticipation hook (patterns/predictions). |
| 60-Day Retention | > 25% | Mixpanel: users who opened app on day 60 / users who completed onboarding 60 days ago | This is the critical threshold. 60 days means users have experienced 2+ cycle-aligned insight rounds. If they leave after that, the insights are not valuable enough. |
| Net Promoter Score (NPS) | > 40 | In-app survey at day 30 and day 60: "How likely are you to recommend PeakHer to a friend? (0-10)" | NPS > 40 is "excellent" for consumer apps. Below 20 suggests the product is not differentiated. |
| First Insight Milestone | > 50% of users | Backend: percentage of users who have at least 1 insight generated / total users who completed onboarding 30+ days ago | If fewer than half of users reach the "pattern unlock" moment, either the data threshold is too high or check-in completion is too low. Both are fixable. |
| Time to First Insight | < 16 days median | Backend: median days from first check-in to first insight generation | If it takes longer than 16 days, the cold-start period is too long and users will churn before experiencing value. |
| Average Check-in Duration | < 20 seconds | Mixpanel: time from check-in screen open to submission | If check-ins take longer than 20 seconds, friction is too high. The target is 15 seconds for required fields only. |
| Crash-Free Rate | > 99.5% | Firebase Crashlytics or Sentry | Below 99% indicates serious stability issues. |

### Decision Framework

| Outcome | Criteria | Action |
|---------|----------|--------|
| Green light Phase 2 | >= 6 of 9 metrics hit targets, including check-in completion and 30-day retention | Proceed to Phase 2 (integrations, ML, team mode) |
| Extended beta | 4-5 of 9 metrics hit targets | Iterate on weak areas for 4-6 more weeks, then re-evaluate |
| Pivot | < 4 of 9 metrics hit targets | Conduct user interviews to understand why. Consider significant product changes or audience narrowing. |

---

### Analytics Events to Track

Every user interaction that matters for understanding product health, feature adoption, and user behavior.

**Onboarding Events**

| Event Name | Properties | Purpose |
|-----------|------------|---------|
| `onboarding_started` | `source` (organic, invite, referral) | Track onboarding funnel entry |
| `onboarding_step_completed` | `step_number` (1-4), `step_name`, `time_spent_seconds` | Identify drop-off points in onboarding |
| `onboarding_step_skipped` | `step_number`, `step_name` | Track which optional steps are skipped |
| `personas_selected` | `personas` (array), `count` | Understand persona distribution |
| `cycle_tracking_enabled` | `average_cycle_length`, `uses_hormonal_bc`, `regularity` | Cycle tracking adoption rate |
| `cycle_tracking_skipped` | -- | Cycle tracking skip rate |
| `onboarding_completed` | `total_time_seconds`, `personas_count`, `cycle_tracking_enabled` | Onboarding completion rate and configuration |
| `onboarding_abandoned` | `last_step`, `time_spent_seconds` | Where and when users abandon onboarding |

**Check-in Events**

| Event Name | Properties | Purpose |
|-----------|------------|---------|
| `checkin_screen_opened` | `source` (notification, home, calendar) | How users reach the check-in |
| `checkin_submitted` | `energy_level`, `confidence_level`, `optional_fields_count`, `has_notes`, `cycle_day`, `time_to_complete_seconds` | Core engagement metric |
| `checkin_updated` | `fields_changed` (array) | End-of-day updates |
| `checkin_reminder_received` | -- | Notification delivery |
| `checkin_reminder_tapped` | -- | Notification conversion |
| `checkin_skipped_day` | `days_since_last_checkin` | Gap analysis |
| `streak_milestone_reached` | `streak_days` | Habit formation tracking |

**Event Logging Events**

| Event Name | Properties | Purpose |
|-----------|------------|---------|
| `quick_log_opened` | `source` (fab, home, calendar) | Quick-log entry points |
| `event_logged` | `event_type`, `category`, `has_description`, `has_outcome_rating`, `time_to_complete_seconds` | Event logging behavior |
| `event_deleted` | `event_type`, `category`, `days_since_created` | Event cleanup behavior |

**Cycle Tracking Events**

| Event Name | Properties | Purpose |
|-----------|------------|---------|
| `period_logged` | `cycle_length` (if previous cycle closed), `days_since_last_period` | Cycle tracking consistency |
| `cycle_phase_viewed` | `current_phase`, `cycle_day` | Phase awareness |
| `cycle_prediction_viewed` | `days_ahead` | Forward-looking behavior |

**Pattern and Insight Events**

| Event Name | Properties | Purpose |
|-----------|------------|---------|
| `pattern_detected` | `pattern_type`, `confidence_score`, `data_points_used`, `is_new` | Pattern detection performance |
| `pattern_dashboard_viewed` | `time_range_selected`, `patterns_displayed_count` | Dashboard engagement |
| `insight_generated` | `insight_type`, `category`, `relevance_score` | Insight generation volume and quality |
| `insight_viewed` | `insight_id`, `insight_type`, `category` | Insight consumption |
| `insight_feedback_given` | `insight_id`, `was_helpful`, `insight_type`, `category` | Insight quality measurement |
| `insight_feed_scrolled` | `insights_viewed_count`, `scroll_depth` | Feed engagement depth |

**Prediction and Week Ahead Events**

| Event Name | Properties | Purpose |
|-----------|------------|---------|
| `week_ahead_viewed` | `days_displayed`, `has_cycle_data` | Week Ahead adoption |
| `week_ahead_day_tapped` | `day_offset`, `predicted_energy`, `predicted_confidence` | Which predictions users examine |
| `prediction_accuracy_viewed` | `overall_accuracy`, `days_with_data` | Trust in predictions |
| `weekly_briefing_opened` | `was_from_notification`, `days_since_generation` | Briefing engagement |
| `weekly_briefing_scroll_depth` | `sections_viewed` (array) | Which briefing sections are read |

**Navigation and General Events**

| Event Name | Properties | Purpose |
|-----------|------------|---------|
| `app_opened` | `source` (cold_start, background, notification), `time_since_last_open_hours` | Session frequency |
| `app_session_ended` | `duration_seconds`, `screens_visited` (array), `actions_taken_count` | Session depth |
| `tab_switched` | `from_tab`, `to_tab` | Navigation patterns |
| `notification_permission_granted` | -- | Notification opt-in rate |
| `notification_permission_denied` | -- | Notification opt-out rate |
| `theme_changed` | `new_theme` | Theme preference |
| `feedback_submitted` | `source` (shake, menu), `has_screenshot` | Feedback volume |

**Settings and Account Events**

| Event Name | Properties | Purpose |
|-----------|------------|---------|
| `persona_updated` | `added` (array), `removed` (array), `new_count` | Persona changes |
| `notification_setting_changed` | `notification_type`, `enabled` | Notification preference changes |
| `data_export_requested` | -- | Export frequency |
| `account_deletion_started` | -- | Churn signal |
| `account_deleted` | `days_since_signup`, `total_checkins`, `total_events` | Churn analysis |

---

## Section 7: Cost Estimate

### Development Costs

All estimates assume building the MVP as defined in this document (Sections 1-5), targeting the 16-week timeline (Phase 0 through Phase 4).

#### Option A: Solo Developer

**Profile:** Full-stack developer with React Native and Python experience, capable of handling both frontend and backend, with basic design skills or working from a provided design system.

| Item | Estimate |
|------|----------|
| Timeline | 16-20 weeks (may extend due to context switching between frontend, backend, and infrastructure) |
| Hourly rate (US-based senior) | $150-200/hr |
| Hourly rate (international senior) | $75-120/hr |
| Total hours | ~640-800 hours |
| **Total cost (US-based)** | **$96,000 - $160,000** |
| **Total cost (international)** | **$48,000 - $96,000** |

Risks: Single point of failure. No code review. Design quality may suffer. Slower iteration during beta (one person handling bugs, feedback, and new features simultaneously).

Benefits: Lowest total cost. No coordination overhead. Fast decision-making.

#### Option B: Small Team (2-3 Developers + 1 Designer)

**Profiles:**
- Lead developer / architect (full-stack, owns backend + infrastructure)
- Frontend developer (React Native specialist, owns mobile app)
- Designer (UI/UX, owns design system, wireframes, and user testing)
- Optional: Part-time QA engineer for Phases 3-4

| Item | Estimate |
|------|----------|
| Timeline | 12-16 weeks (parallelization of frontend and backend work) |
| Monthly cost (2 devs + 1 designer, US-based) | $40,000 - $60,000/month |
| Monthly cost (2 devs + 1 designer, international/mixed) | $20,000 - $35,000/month |
| **Total cost (US-based, 4 months)** | **$160,000 - $240,000** |
| **Total cost (international/mixed, 4 months)** | **$80,000 - $140,000** |

Risks: Coordination overhead. Potential misalignment between frontend and backend. Higher burn rate.

Benefits: Faster delivery. Code reviews improve quality. Dedicated designer produces a more polished product. Multiple people can handle beta support.

#### Option C: Agency

**Profile:** Mobile app development agency handling design, development, QA, and project management.

| Item | Estimate |
|------|----------|
| Timeline | 14-20 weeks (agencies often have slower ramp-up but dedicated resources) |
| Fixed-bid estimate (US/EU agency) | $150,000 - $300,000 |
| Fixed-bid estimate (offshore agency) | $60,000 - $120,000 |
| **Total cost (US/EU agency)** | **$150,000 - $300,000** |
| **Total cost (offshore agency)** | **$60,000 - $120,000** |

Risks: Less control over technical decisions. Knowledge transfer challenges when bringing development in-house. Agency may not deeply understand the domain (women's health + performance intelligence). Fixed-bid contracts incentivize shipping features, not quality.

Benefits: Turnkey solution. Project management included. Can scale resources up for Phase 3 (QA, polish) without hiring.

#### Recommendation

For PeakHer, **Option B (small team, international/mixed)** at **$80,000-$140,000** provides the best balance of speed, quality, and cost. Specifically:

- 1 senior full-stack developer (backend-focused, $8,000-$12,000/month) -- owns FastAPI, database, pattern detection, deployment
- 1 React Native developer ($6,000-$10,000/month) -- owns mobile app, state management, charts
- 1 UI/UX designer ($4,000-$8,000/month, part-time acceptable) -- owns design system, wireframes, user testing, onboarding flow

Total monthly: ~$18,000-$30,000 for ~4 months.

---

### Infrastructure Costs (Monthly)

#### Tier 1: 0-100 Users (Beta)

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Supabase (Database + Auth + Storage) | Free tier (500MB DB, 1GB storage, 50K MAU) | $0 |
| Railway (FastAPI + Celery worker) | Starter ($5 credit) | $0-5 |
| Redis (Railway add-on or Upstash) | Free tier (256MB, Upstash) | $0 |
| Firebase Cloud Messaging | Free (no per-message cost) | $0 |
| Apple Developer Program | Annual ($99/year = ~$8.25/month) | $8.25 |
| Google Play Developer | One-time $25 fee | $2 (amortized) |
| Mixpanel (Analytics) | Free tier (20M events/month) | $0 |
| Domain + DNS (Cloudflare) | Free tier | $0 |
| **Total** | | **$10-15/month** |

#### Tier 2: 100-1,000 Users

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Supabase | Pro plan (8GB DB, 100GB storage, unlimited auth) | $25 |
| Railway (FastAPI + Celery) | Pro (usage-based, ~$10-30 at this scale) | $20 |
| Redis (Upstash) | Pay-as-you-go (~10K commands/day) | $5 |
| Cloudflare R2 (data exports) | Pay-as-you-go (minimal at this scale) | $2 |
| Sentry (error tracking) | Team plan | $26 |
| Mixpanel | Free tier (still under 20M events) | $0 |
| Apple Developer + Google Play | -- | $10 |
| **Total** | | **$88-108/month** |

#### Tier 3: 1,000-10,000 Users

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Supabase | Pro plan + compute add-on (larger instance) | $75-150 |
| Railway (FastAPI + 2 Celery workers) | Pro (usage-based) | $50-100 |
| Redis (Upstash or Railway) | Pro tier | $20 |
| Cloudflare R2 | Pay-as-you-go | $10 |
| Sentry | Team plan | $26 |
| Mixpanel | Growth plan (100M events) | $0-28 |
| Apple Developer + Google Play | -- | $10 |
| Celery monitoring (Flower or similar) | Self-hosted on Railway | $5 |
| **Total** | | **$196-349/month** |

**Note:** At 10,000+ users, it may become cost-effective to migrate from Supabase + Railway to AWS (RDS + ECS/Fargate) for more granular cost control and reserved instance pricing. This migration is a Phase 3+ consideration and should not influence MVP architecture.

---

## Section 8: Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **Low daily check-in completion.** Users find the check-in too friction-heavy or forget to do it, resulting in insufficient data for pattern detection. | High | Critical | Design check-in to complete in under 15 seconds (two sliders only). Push notification reminders. Streak gamification. Instant feedback on submission (comparison to historical average). Consider reducing to a single "How do you feel?" composite score if two sliders prove to be too much. |
| 2 | **Insufficient data for meaningful patterns.** Even with consistent check-ins, 14-30 days of 1-10 slider data may not produce statistically significant patterns. The "insight unlock" moment may disappoint. | Medium | Critical | Set expectations during onboarding ("Patterns emerge after 2-4 weeks"). Pre-compute insight templates that work with minimal data ("Your average energy this week was 6.8, up from 5.9 last week"). Ensure the first insight feels valuable even if it is simple. Test with synthetic data during development to calibrate detection thresholds. |
| 3 | **Privacy and data sensitivity concerns.** Users are uncomfortable sharing menstrual cycle, energy, and emotional data with an app, especially given the post-Roe environment in the US and general health data sensitivity. | High | High | End-to-end encryption for health fields (pgcrypto). Data stored in user's timezone with no cross-user analytics in v1. Hard delete on account deletion (no soft deletes, no data retention). Clear privacy policy written in plain language. No third-party data sharing. Data export available at any time. Consider on-device processing for pattern detection in Phase 2 to eliminate server-side health data storage. |
| 4 | **App Store rejection.** Apple rejects the app for health claims, insufficient privacy disclosures, or UI guideline violations. Google Play has similar but less strict review. | Medium | High | Do not make medical claims. The app tracks "energy" and "confidence," not medical symptoms. Do not position as a medical device. Complete Apple's health data privacy nutrition labels accurately. Include age-gating (17+ if cycle tracking is prominent). Submit to App Store review 2 weeks before target beta launch to allow for rejection and resubmission. |
| 5 | **Cycle tracking accuracy.** Predicted cycle phases are inaccurate for users with irregular cycles, leading to incorrect pattern detection and bad recommendations. | Medium | Medium | Phase predictions include a confidence score that is low for irregular-cycle users. Clearly communicate that predictions are estimates ("Based on your last 3 cycles, your next period is predicted around March 28, +/- 3 days"). Allow manual override of predicted phase. Never make definitive statements about fertility or medical status. Provide "irregular cycle" mode that disables phase-specific predictions and relies only on the user's manually logged cycle days. |
| 6 | **Notification fatigue.** Too many push notifications annoy users and lead to notification permission revocation or app uninstallation. | Medium | Medium | Conservative notification defaults: only check-in reminder and weekly briefing enabled by default. Maximum 1 insight notification per day. No notifications after 9 PM or before 7 AM in user's timezone. Easy per-type notification controls in settings. Track notification-to-action conversion rate; if below 10%, reduce frequency. |
| 7 | **Single-platform dependency (Supabase).** Supabase outage takes down database, auth, and storage simultaneously, rendering the app completely non-functional. | Low | High | Supabase has 99.9% uptime SLA on Pro plan. Implement offline check-in queue so users can still log data during outages. Daily automated database backups to an independent S3/R2 bucket. Document migration path to self-hosted PostgreSQL + custom auth if Supabase becomes unviable. At 10K+ users, consider multi-region setup. |
| 8 | **Scope creep during development.** Team adds features beyond the defined MVP scope, pushing the timeline past 16 weeks and increasing cost. | High | Medium | This document is the scope contract. Any feature not listed in Section 1 "What is IN the MVP" is out of scope for v1. All change requests go through a formal evaluation: What does it replace? What does it delay? Bi-weekly scope reviews comparing planned vs. actual progress. |
| 9 | **Designer/developer availability.** Key team members leave, become unavailable, or underperform during the 16-week timeline. | Medium | High | Document all architectural decisions (this document + TECHNICAL_ARCHITECTURE.md). Use standard, well-documented tools (React Native, FastAPI, PostgreSQL) so replacement developers can ramp up quickly. No single person should hold undocumented knowledge. Weekly code reviews ensure knowledge sharing. |
| 10 | **Chart/visualization performance on older devices.** Victory Native or equivalent charting library performs poorly on budget Android devices when rendering 90-day datasets with multiple overlay layers. | Medium | Low | Test on budget devices (Samsung Galaxy A series) from Week 10 onward. If performance is unacceptable: limit default view to 30 days, lazy-load chart data, reduce animation complexity, or switch to a lighter charting library. Consider SVG-based static charts as a fallback. |
| 11 | **Beta user recruitment falls short.** Unable to recruit 100 beta users across target personas, leading to insufficient feedback diversity. | Medium | Medium | Start recruitment in Week 8 (not Week 15). Use multiple channels: personal network, social media, women's professional communities, fitness communities, parenting groups. Offer founding member incentives (free premium tier for life, or first 6 months). Create a waitlist landing page to build interest before beta launch. Target 200 signups to achieve 100 active beta users. |
| 12 | **Pattern detection produces trivial or obvious insights.** "Your energy is higher on weekends" or "You feel better when you sleep well" -- insights that are true but not valuable. | Medium | Medium | Design the insight template library to prioritize non-obvious, actionable insights. Rank templates by specificity: "Your energy peaks on cycle days 10-14, averaging 8.2" is more valuable than "Sleep affects your energy." Use the insight feedback system (thumbs up/down) to deprioritize templates that users consistently rate as unhelpful. In Phase 2, cross-domain insights (correlating events with patterns) will be more novel. |
| 13 | **Users do not track cycles, eliminating the core differentiator.** If the majority of users skip cycle tracking, PeakHer loses its primary competitive advantage over generic mood/energy trackers. | Medium | High | Track cycle tracking opt-in rate as a leading indicator. If below 40%, investigate: Is the onboarding framing off? Is there a trust issue? Are users unaware of the value? Consider: post-onboarding prompt after 7 days of check-ins ("Cycle tracking could unlock deeper patterns -- want to enable it?"). Ensure the app is still valuable without cycle tracking (day-of-week patterns, cross-domain correlations, rolling average predictions). |
| 14 | **GDPR / privacy regulation compliance gaps.** PeakHer processes sensitive health data (menstrual cycle information) which is classified as "special category data" under GDPR and similar regulations. Non-compliance could result in fines and reputational damage. | Medium | High | Obtain explicit consent for health data processing during onboarding (separate from general terms). Implement data minimization (only collect what is needed). Provide data portability (JSON export). Provide right to erasure (hard delete). Appoint a data protection point-of-contact. Consult with a privacy attorney before beta launch. If operating in the EU, ensure data is stored in EU-based Supabase region. |
| 15 | **Prediction accuracy is too low, undermining trust.** If Week Ahead predictions are frequently wrong, users lose confidence in the entire product. | Medium | Medium | Display prediction confidence scores so users calibrate expectations. Start with conservative predictions (closer to rolling averages) rather than aggressive ones. Track prediction accuracy over time and display the improvement trend ("Predictions are 74% accurate, up from 68% last month"). Do not show predictions until sufficient data exists (30+ check-ins). Frame predictions as "estimates based on your patterns," not as certainties. |

---

## Appendix: Sprint-Level Task Breakdown Summary

For reference, the total estimated development hours by phase:

| Phase | Estimated Hours | Weeks |
|-------|----------------|-------|
| Phase 0: Foundation | ~80 hours | 2 |
| Phase 1: Core Tracking | ~160 hours | 4 |
| Phase 2: Intelligence Layer | ~160 hours | 4 |
| Phase 3: Polish and Beta Prep | ~160 hours | 4 |
| Phase 4: Beta Launch | ~40 hours (+ ongoing) | 2 |
| **Total** | **~600 hours** | **16** |

This maps to approximately 37.5 hours/week for a solo developer, or 18-20 hours/week per developer on a two-person team. Both are sustainable paces that include buffer for unexpected issues.

---

**End of Document**

*This roadmap should be reviewed and updated at the end of each development phase. Scope changes require approval and an impact assessment against the 16-week timeline and budget.*
