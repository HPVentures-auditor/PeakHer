# Many Hats / PeakHer -- Product Specification

**Version:** 1.0
**Last Updated:** 2026-03-11
**Status:** Pre-Development
**Classification:** Confidential

---

## Table of Contents

1. [Vision and Mission](#1-vision-and-mission)
2. [User Journey](#2-user-journey)
3. [Core Features -- MVP](#3-core-features--mvp)
4. [Phase 2 Features](#4-phase-2-features)
5. [Phase 3 Features](#5-phase-3-features)
6. [Screens and UX](#6-screens-and-ux)
7. [Data Model](#7-data-model)
8. [Tech Stack Recommendation](#8-tech-stack-recommendation)
9. [MVP Scope and Priorities](#9-mvp-scope-and-priorities)
10. [Privacy and Ethics](#10-privacy-and-ethics)
11. [Business Model](#11-business-model)
12. [Competitive Landscape](#12-competitive-landscape)
13. [Appendix: Target Personas](#appendix-target-personas)

---

## 1. Vision and Mission

### Vision (One-Liner)

Every woman should know -- from her own data, not a textbook -- exactly when she is built to push, create, connect, rest, and perform at her highest level across every role she plays.

### Mission Statement

PeakHer is a personal performance intelligence platform that helps women discover their unique biological and behavioral patterns across all areas of life. By correlating lightweight daily inputs with passive performance data, PeakHer reveals each woman's individual rhythms and predicts her best windows for every type of work -- sales, training, parenting, creating, leading, and resting. It is not a period tracker. It is the first tool that treats the menstrual cycle as one signal among many and applies that intelligence to the full complexity of a woman's life.

### Core Principles

**1. Empowerment, Not Limitation**
PeakHer never tells a woman what she cannot do. It tells her what she is uniquely primed to do. The goal is to amplify capacity, not restrict it. No screen should ever communicate "you can't do X today." Every signal is framed as an opportunity or an insight.

**2. Her Data, Not a Textbook**
Generic cycle-phase advice ("you're in your luteal phase, so do admin work") is reductive and often wrong for any individual woman. PeakHer makes zero assumptions. Every pattern, prediction, and insight is derived from her own tracked data over time. Two women on the same cycle day may receive completely different signals because their bodies and lives are different.

**3. The Whole Woman, Not One Role**
Women do not live in a single domain. They close deals in the morning, train at lunch, parent in the evening, and create at night. PeakHer tracks and correlates performance across all of these domains simultaneously. This is the foundational differentiator.

**4. Privacy-First, Always**
This data is among the most sensitive information a person can generate -- biological rhythms, health metrics, emotional states, professional performance. In the post-Dobbs environment, this is not an abstract concern. Privacy is not a feature; it is an architectural constraint. Data is encrypted, never sold, never shared without explicit consent, and deletable at any time.

**5. Gets Smarter Every Month**
The value of PeakHer compounds. Month one is useful. Month six is transformative. Month twelve is indispensable. Every data point makes the model more accurate, the predictions more specific, and the insights more actionable. This is the retention flywheel.

---

## 2. User Journey

### 2.1 Onboarding (Day 0) -- Target: Under 3 Minutes

**Step 1: Account Creation**
- Sign up with email, Apple ID, or Google
- First name only (last name optional)
- No demographic questions beyond what is necessary
- Immediate reassurance about data privacy (one sentence, not a wall of text)

**Step 2: "Tell Us About Your Hats"**
- Screen header: "What hats do you wear?"
- User selects 1-5 persona tiles from a visual grid:
  - Saleswoman / Business Development
  - Athlete / Fitness
  - Entrepreneur / Business Owner
  - Mom / Caregiver
  - Executive / Leader
  - Creative
- Each tile has a one-line description and a subtle illustration
- Selecting a persona reveals 2-3 follow-up questions specific to that role (e.g., selecting "Saleswoman" asks: "What CRM do you use?" and "What does a great sales day look like for you?")
- Users can add custom hats with free-text labels

**Step 3: Cycle Context (Optional, Clearly Marked)**
- Screen header: "Do you want to include cycle data? (Totally optional)"
- Three paths:
  - **"Yes, I track my cycle"** -- asks for average cycle length, last period start date, and whether she uses a tracking app (offer to sync)
  - **"I'm on birth control / have irregular cycles"** -- acknowledges this, explains the app still works by finding energy and performance patterns independent of a traditional cycle
  - **"No thanks, skip this"** -- no friction, no guilt, no follow-up. The app works without this data entirely.
- Brief explanation: "Your cycle is one signal among many. PeakHer finds your patterns whether or not you track it."

**Step 4: Connect Your World (Optional)**
- Screen shows available integrations with toggle switches:
  - Calendar (Google Calendar, Apple Calendar, Outlook)
  - Fitness (Apple Health, Garmin, Whoop, Oura)
  - CRM (HubSpot, Salesforce) -- Phase 2, shown as "Coming Soon"
- Each integration has a one-line value proposition ("We'll passively see when you have meetings so you don't have to log them")
- "Skip for now" is prominent and judgment-free

**Step 5: First Daily Check-In**
- Immediately after onboarding, the user completes her first check-in (described in Section 3.1)
- This establishes the habit from minute one
- Celebrate completion: "Day 1 of discovering your patterns. This took 10 seconds. That's all it ever takes."

### 2.2 First Week -- Building the Habit

**Goal:** Establish the daily check-in as a micro-habit (under 10 seconds) and introduce quick-logging.

- **Day 1:** First check-in completed during onboarding. Evening push notification: "How did today go? Tap to quick-log a win."
- **Day 2:** Morning notification at user-selected time: "Good morning. 10 seconds for your check-in." After check-in, introduce quick-log: "Did anything notable happen yesterday? Tap to log it."
- **Days 3-5:** Continue morning reminders. Begin showing a simple "Your Week So Far" view -- a row of 3-5 dots colored by energy level. No insights yet. The message is: "We're listening. Keep going."
- **Days 6-7:** First micro-insight (even if shallow): "You've checked in for a full week. Your highest energy day so far was [Wednesday]. Let's see if that holds." Weekly briefing notification: summary of the week's energy and confidence trends.

**Key UX Principle for Week 1:** Do not overwhelm. Do not show empty dashboards. Every screen the user can reach should either have content or a clear, encouraging message about when content will appear. Never show a blank chart.

### 2.3 First Month -- Initial Patterns Emerge

**Goal:** Accumulate enough data points (25-30 daily check-ins, plus passive data) to surface initial correlations.

- **Week 2:** Begin showing basic trend lines (energy over time, confidence over time). If cycle data is provided, overlay cycle day as a subtle background layer.
- **Week 3:** First AI-generated insight card: "We noticed your energy tends to dip on days with 4+ meetings. Is that accurate?" (Asks for confirmation to improve the model.)
- **Week 4:** If cycle data available, first cycle-correlated observation: "During days 5-10 of your last cycle, your logged confidence was 15% higher than your monthly average." If no cycle data: "Your energy follows a roughly [X]-day rhythm. We're watching to see if this repeats."
- **End of Month 1:** Unlock the Pattern Dashboard in "preview" mode. Show preliminary patterns with clear confidence indicators. Message: "This is early. Give us one more month and these patterns will sharpen dramatically."

### 2.4 Month 3+ -- Full Pattern Recognition and Predictive Signals

**Goal:** The app becomes genuinely predictive and indispensable.

- **Pattern Dashboard** is fully populated with multi-cycle overlays
- **Week-Ahead View** activates with meaningful predictions:
  - "Based on your last 3 cycles, this Wednesday through Friday tends to be your highest-energy window. You have two sales calls scheduled -- good timing."
  - "Next Tuesday looks like a lower-energy day historically. You have a board presentation scheduled. Consider prepping materials this week while energy is high."
- **Cross-domain correlations** begin appearing:
  - "When you log a great workout in the morning, your afternoon sales confidence is 22% higher on average."
  - "Your creative flow states cluster on days 7-12 of your cycle. You haven't blocked any writing time this month during that window."
- **Insight cards** become increasingly specific and actionable
- **The retention flywheel kicks in:** the more she uses it, the smarter it gets, the more valuable it becomes, the more she uses it

### 2.5 Month 6+ -- Deep Intelligence and Shareable Reports

**Goal:** PeakHer becomes a strategic life tool, not just a daily tracker.

- **Longitudinal trend analysis:** "Your average energy has increased 8% over the last 3 months. Your sleep consistency improved during the same period -- likely correlated."
- **Anomaly detection:** "Your energy this cycle is significantly lower than your 6-month average. Worth paying attention to -- could be seasonal, stress-related, or worth mentioning to your doctor."
- **Exportable reports:** Generate a PDF or shareable link summarizing her patterns for:
  - Her coach or trainer ("Here are my optimal training windows")
  - Her therapist ("Here's how my mood and energy trend over time")
  - Her doctor ("Here's a 6-month view of my cycle regularity and energy")
  - Herself ("Here's my quarterly performance review -- by my own metrics")
- **Year-in-review:** Annual summary of patterns, growth, and insights

---

## 3. Core Features -- MVP

### 3.1 Daily Check-In

**Purpose:** The atomic unit of the product. Two slider inputs that take under 10 seconds.

**Interface:**
- Two horizontal sliders, each on a 1-10 scale:
  - **Energy:** "How's your energy right now?" (1 = completely drained, 10 = unstoppable)
  - **Confidence:** "How confident do you feel today?" (1 = uncertain about everything, 10 = I could conquer the world)
- Sliders default to center (5) and move with a thumb drag
- Below the sliders, three optional expandable fields (collapsed by default):
  - **Sleep:** "How'd you sleep?" (1-10 slider)
  - **Stress:** "How stressed are you?" (1-10 slider)
  - **Cycle Day:** Auto-populated if cycle tracking is enabled; manual entry if not. Can be skipped.
- Optional free-text note field (collapsed): "Anything else on your mind?"
- Large "Done" button
- Completion confirmation with a brief, non-annoying affirmation

**Behavior:**
- Available starting at 5:00 AM in user's local timezone
- Morning push notification at user-selected time (default: 8:00 AM)
- If not completed by noon, a gentle second nudge (configurable or disableable)
- Can be edited until midnight of the same day
- Streak counter shown subtly (not gamified to the point of anxiety)

**Design Notes:**
- The screen must be completable with one thumb on a phone held in one hand
- No scrolling required for the core two sliders
- The optional fields should never feel obligatory
- Color palette should be warm, calm, and non-clinical

### 3.2 Quick-Log Events

**Purpose:** Capture discrete performance events with minimal friction so they can be correlated to patterns later.

**Interface:**
- Floating action button (FAB) accessible from any screen
- Tapping opens a quick-log sheet with pre-configured event types based on selected personas:
  - **Saleswoman:** "Closed a deal", "Great call", "Pipeline win", "Tough rejection", custom
  - **Athlete:** "Great workout", "New PR", "Low-energy session", "Recovery day", custom
  - **Entrepreneur:** "Launched something", "Creative breakthrough", "Good decision", "Revenue event", custom
  - **Mom:** "Patient day", "Quality time", "Rough morning", "Felt present", custom
  - **Executive:** "Strong presentation", "Good negotiation", "Strategic clarity", "Difficult conversation", custom
  - **Creative:** "Flow state", "Finished a piece", "Writer's block", "Inspiration hit", custom
- Each event can optionally have:
  - An outcome rating (1-5 stars or a simple good/neutral/bad)
  - A one-line note
  - A timestamp override (defaults to now)
- One tap to log, two taps to add detail

**Behavior:**
- Events are tagged with the current date, time, and persona category
- Events feed into the pattern recognition engine as outcome data points
- Users can view a chronological event log and edit/delete past entries
- Suggested events can appear based on calendar data (e.g., after a meeting ends: "How did that presentation go?")

### 3.3 Week-Ahead Predictive View

**Purpose:** The core predictive feature. Shows the upcoming 7 days with predicted energy, confidence, and recommended focus areas based on her historical patterns.

**Availability:** Activates after 2-3 complete cycles of data (approximately 60-90 days of check-ins). Before activation, this screen shows a progress indicator: "12 more days of data until your predictions unlock."

**Interface:**
- Horizontal 7-day timeline
- Each day shows:
  - **Predicted energy level** (visual bar or wave, color-coded)
  - **Predicted confidence level** (visual bar or wave, color-coded)
  - **Calendar events** pulled from integrations (meetings, workouts, etc.)
  - **Signal flags** (0-2 per day):
    - "High-performance window" -- historically her best days for demanding work
    - "Creative peak" -- historically her best days for creative/generative work
    - "Recovery zone" -- historically lower-energy; good for admin, planning, rest
    - "Push day" -- energy and confidence both predicted high
    - Custom signals that emerge from her specific data
- Tapping a day expands to show:
  - The data behind the prediction ("In your last 3 cycles, days like this averaged 7.8 energy and 8.2 confidence")
  - Specific recommendations by persona ("Your close rate is 40% higher on days like this -- great day for prospect calls")
  - Calendar conflicts or opportunities ("You have a board meeting on what's historically a lower-energy day -- consider prepping this weekend")

**Design Notes:**
- Predictions always include a confidence indicator (how sure the model is)
- Predictions are never presented as certainties -- language is always "tends to", "historically", "based on your data"
- The user can override or dismiss any prediction
- Predictions improve continuously as more data accumulates

### 3.4 Pattern Dashboard

**Purpose:** The signature screen of the product. A visual representation of her unique performance patterns overlaid on time, cycle, and calendar data.

**Interface:**
- Primary view: A multi-layered timeline chart spanning 1-3 months:
  - **Layer 1 (background):** Cycle phases (if tracked) shown as colored bands -- follicular, ovulatory, luteal, menstrual. If no cycle data, this layer shows a subtle repeating energy rhythm detected by the AI.
  - **Layer 2:** Energy trend line (daily values connected as a smooth curve)
  - **Layer 3:** Confidence trend line (same treatment)
  - **Layer 4:** Event markers (dots or flags on the timeline for each quick-logged event, color-coded by persona)
  - **Layer 5 (optional):** Sleep, stress, or HRV data from integrations
- Interaction: Pinch to zoom (day/week/month granularity), swipe to scroll through time
- Toggle controls to show/hide each layer
- Below the chart: **Pattern Summary Cards** -- the AI's top 3-5 identified patterns in plain language:
  - "Your energy peaks around day 8-12 and dips around day 22-26"
  - "Sales wins cluster in the first half of your cycle (72% of closed deals)"
  - "Morning workouts correlate with 18% higher afternoon confidence"
  - "Your stress spikes on Mondays regardless of cycle position -- likely work-related, not biological"
- Each pattern card shows:
  - Confidence score (how statistically robust the pattern is)
  - Number of data points supporting it
  - A "Does this feel right?" feedback button (thumbs up/down to refine the model)

**Cycle Overlay Mode (if cycle data available):**
- Stacks multiple cycles on top of each other (aligned by cycle day) to show the repeating pattern
- Visual average with range bands (showing variability)
- Highlights the most consistent patterns vs. the most variable ones

### 3.5 Insight Cards (AI-Generated)

**Purpose:** Proactive, personalized observations delivered as digestible cards in a feed.

**Content Types:**
- **Correlation insights:** "When you sleep 7+ hours, your next-day confidence averages 7.4 vs. 5.8 on shorter sleep nights."
- **Cycle-linked insights:** "Your creative flow states happen 3x more often during days 6-14 of your cycle."
- **Cross-domain insights:** "After high-energy workouts, your sales call ratings are 30% better that afternoon."
- **Trend insights:** "Your average energy has been climbing for 6 weeks -- whatever you're doing, it's working."
- **Anomaly insights:** "This week's energy is 2 points below your typical pattern for this cycle phase. Sleep has also been lower -- possibly related."
- **Actionable insights:** "You have a pitch on Thursday. Historically, you perform best in pitches when you've worked out that morning and slept 7+ hours the night before."

**Behavior:**
- New insights generated weekly (or when significant patterns are detected)
- Delivered as a scrollable feed on the Insights tab
- Optionally surfaced as push notifications for high-relevance insights
- Each card has: headline, detail text, supporting data visualization (mini-chart), feedback buttons
- Insights improve in specificity and accuracy over time
- Dismissed insights are deprioritized in future generation

**Generation Logic:**
- Minimum data thresholds before each insight type activates (e.g., need 30+ days for trend insights, 2+ cycles for cycle-correlated insights)
- Confidence scoring: only surface insights above a minimum statistical confidence
- Relevance scoring: prioritize insights related to the user's selected personas
- Novelty scoring: avoid repeating the same insight; surface new discoveries

### 3.6 Calendar Integration (Passive)

**Purpose:** Automatically capture meeting load, event types, and scheduling patterns without requiring manual logging.

**Supported Integrations (MVP):**
- Google Calendar (OAuth)
- Apple Calendar (HealthKit/EventKit)
- Outlook/Microsoft 365 (OAuth)

**Data Captured:**
- Number of meetings per day
- Meeting duration totals
- Time blocks (morning heavy vs. afternoon heavy)
- Meeting-free days
- Event titles (processed locally for categorization, never stored in plain text on servers)

**How It's Used:**
- Correlate meeting load with energy/confidence patterns
- Detect that "4+ meeting days" consistently correlate with lower next-day energy
- Feed scheduling data into the predictive model
- Suggest optimal meeting placement: "Based on your patterns, schedule high-stakes meetings on Tuesday/Wednesday mornings"

### 3.7 Notification and Reminder System

**Types:**
- **Morning check-in reminder:** Configurable time, configurable days (default: daily at 8 AM)
- **Post-event quick-log prompt:** After a calendar event ends, nudge to rate it (configurable, off by default)
- **Weekly briefing:** Sunday evening or Monday morning summary of last week's patterns and the week ahead's predictions
- **Insight alerts:** When a particularly relevant or novel insight is generated
- **Streak maintenance:** Gentle nudge if a check-in is missed (not guilt-inducing; disappears after one reminder)

**Configuration:**
- All notifications individually toggleable
- Quiet hours configurable
- Frequency controls (daily, weekdays only, etc.)
- Tone is always warm, supportive, and non-judgmental

---

## 4. Phase 2 Features

### 4.1 CRM Integration

**Supported Platforms:** HubSpot, Salesforce

**Data Captured:**
- Deals closed (date, value)
- Calls made/booked
- Emails sent
- Pipeline movement
- Win/loss events

**Application:**
- Correlate sales performance with energy, confidence, cycle phase, sleep, and stress
- Surface insights like: "Your deal close rate is 2.3x higher during days 8-14 of your cycle"
- Predict optimal days for high-stakes prospect calls
- Identify which conditions (sleep, exercise, meeting load) precede her best sales days

### 4.2 Fitness Tracker Integration

**Supported Platforms:** Apple Health, Garmin Connect, Whoop, Oura Ring

**Data Captured:**
- Workout type, duration, and intensity
- Heart rate variability (HRV)
- Resting heart rate
- Sleep stages and duration
- Recovery scores (from platforms that provide them)
- Steps and activity levels

**Application:**
- Replace self-reported sleep with objective sleep data
- Use HRV as a physiological signal for the pattern model
- Correlate training load with next-day energy and professional performance
- Surface recovery-aware recommendations: "Your HRV is low today -- historically, you perform better in meetings on recovery days when you skip the morning workout"

### 4.3 Team Mode

**Purpose:** Allow sales managers, team leads, or coaches to see aggregate team capacity without accessing individual biological or health data.

**How It Works:**
- Team members opt in individually (never auto-enrolled)
- Manager dashboard shows:
  - Team capacity score (aggregate of self-reported energy/confidence, anonymized)
  - Suggested scheduling: "3 of 5 team members are in high-performance windows this week -- front-load client calls"
  - No individual cycle data, health data, or personal details visible to the manager -- ever
- Individual team members control exactly what is shared and can revoke access at any time
- Clear audit log of what data has been accessed

**Critical Privacy Constraint:** The manager can never reverse-engineer an individual's cycle or health data from the aggregate view. The system must be architected to prevent this, including minimum team sizes for aggregate data (minimum 5 members).

### 4.4 Coach Mode

**Purpose:** Allow the user to share specific views of her data with a trusted professional (trainer, therapist, doctor, business coach).

**How It Works:**
- User generates a shareable link or invites a coach by email
- User selects exactly which data categories to share (energy trends, fitness data, cycle patterns, professional performance, etc.)
- Coach receives a read-only dashboard with only the permitted data
- User can revoke access at any time
- Shared data is view-only; coaches cannot export or download raw data
- Time-limited sharing option (e.g., share for 3 months, then auto-revoke)

### 4.5 Export and Share Reports

**Formats:** PDF, CSV (raw data), shareable web link (time-limited)

**Report Types:**
- Monthly summary
- Quarterly performance review
- Cycle pattern overview (for medical appointments)
- Custom date range with selected metrics
- Persona-specific reports (e.g., "My Sales Performance Patterns -- Q1 2026")

### 4.6 Advanced AI Coaching

**Purpose:** Move beyond insights (observations) to recommendations (actions).

**Examples:**
- "You have a keynote on March 18. Based on your patterns, here's a 5-day prep protocol that aligns with your predicted energy levels."
- "Your last 3 product launches happened during low-energy phases. Consider scheduling your next launch for the first half of your cycle -- historically your execution energy is 35% higher."
- "You've been in a creative slump for 2 weeks. This aligns with a historically lower-creative phase. It typically lifts around day [X]. In the meantime, focus on editing and refining rather than generating."

---

## 5. Phase 3 Features

### 5.1 Community Features

- **Anonymized pattern sharing:** Opt-in to contribute anonymized data to aggregate pattern libraries
- **"Women like you" insights:** "Among women with similar cycle lengths who also selected the Saleswoman persona, 68% report highest close rates during days 8-14"
- **Discussion forums** organized by persona (Saleswomen, Athletes, Moms, etc.)
- **Pattern stories:** User-submitted narratives about how discovering their patterns changed their approach (moderated, anonymized if desired)

### 5.2 Marketplace

- Connect with cycle-aware coaches, trainers, nutritionists, and practitioners
- Verified provider directory
- In-app booking
- Providers can see shared data (with user consent) to personalize their services

### 5.3 Enterprise / Organization License

- Bulk licensing for companies, sales organizations, athletic programs
- Admin dashboard with aggregate (never individual) wellness metrics
- Integration with corporate wellness programs
- Custom onboarding for organizational deployment
- Compliance and reporting features for HR

### 5.4 API for Third-Party Integrations

- RESTful API for developers to build on the PeakHer platform
- Webhooks for real-time event notifications
- OAuth-based access with granular user-controlled permissions
- Use cases: custom dashboards, integration with project management tools, research partnerships

### 5.5 Longitudinal Health Insights

- **Anomaly detection:** Flag significant deviations from established patterns that may warrant medical attention
  - "Your cycle has been irregular for the last 3 months after being consistent for 9 months -- consider mentioning this to your doctor"
  - "Your average energy has dropped 25% over 6 weeks with no change in sleep or stress -- worth investigating"
- **Pre-menopause/perimenopause pattern recognition:** Detect shifting cycle patterns that may indicate perimenopause and provide educational resources
- **Seasonal pattern analysis:** Identify yearly rhythms (e.g., energy dips in winter months)
- **Exportable health timeline** for medical professionals

---

## 6. Screens and UX

### 6.1 Home / Dashboard

**Purpose:** The landing screen after login. Provides an at-a-glance view of today and the near future.

**Layout:**
- **Top section:** Greeting ("Good morning, [Name]") with today's date and cycle day (if tracked)
- **Today's Status:** If check-in is completed, show today's energy and confidence as visual indicators (filled circles, bars, or a simple gauge). If not completed, show the check-in prompt prominently.
- **Quick Stats Row:** 3-4 small cards showing:
  - Current streak (days of consecutive check-ins)
  - This week's average energy
  - Next predicted peak day
  - Active persona count
- **Week-Ahead Preview:** Compact 7-day bar chart showing predicted energy levels (tappable to go to full Week-Ahead View)
- **Latest Insight:** The most recent or most relevant insight card (tappable to go to Insights Feed)
- **Quick-Log FAB:** Floating action button in the bottom-right corner, always accessible
- **Bottom Navigation Bar:** Home, Check-In, Patterns, Insights, Profile

**Design Principles:**
- Never empty -- always shows something useful, even on day 1
- Information density increases as the user accumulates data
- One-thumb navigation from any element to its detail view

### 6.2 Daily Check-In Screen

**Purpose:** The core input screen. Must be fast, simple, and satisfying.

**Layout:**
- Full-screen modal or dedicated tab
- **Energy Slider:** Horizontal, 1-10, with subtle color gradient (cool blue at 1 to warm gold at 10). Labeled endpoints: "Running on empty" to "Fully charged"
- **Confidence Slider:** Same treatment. Labeled endpoints: "Shaky" to "Unstoppable"
- **Optional Section (collapsed by default, expandable with a "More" toggle):**
  - Sleep quality slider (1-10)
  - Stress level slider (1-10)
  - Cycle day (auto-filled or manual)
  - Free-text notes field
- **Submit Button:** Large, prominent, satisfying tap animation
- **Post-Submit:** Brief confirmation ("Logged. You're on a [X]-day streak.") with an option to quick-log an event

### 6.3 Quick-Log Screen

**Purpose:** Rapid event capture.

**Layout:**
- Bottom sheet or modal overlay
- **Event Type Grid:** 6-8 pre-configured event tiles based on selected personas, arranged in a 2-column grid. Each tile has an icon and short label.
- **Custom Event Button:** "Something else..." opens a free-text field
- **Details (optional, expandable):**
  - Outcome rating (3 options: great / okay / tough)
  - One-line note
  - Timestamp adjustment
- **Submit:** Single tap on an event tile logs it immediately; details are optional add-ons

### 6.4 Week-Ahead View

**Purpose:** The predictive planning screen.

**Layout:**
- **Header:** "Your Week Ahead" with date range
- **7-Day Timeline:** Horizontal scrollable timeline with each day as a card:
  - Day name and date
  - Predicted energy bar (height and color)
  - Predicted confidence bar
  - Number of calendar events
  - Signal badges (icons for "push day", "creative peak", "recovery zone", etc.)
- **Selected Day Detail Panel:** Tapping a day card expands a panel below showing:
  - Prediction explanation ("Based on 4 previous cycles, days like this average...")
  - Calendar events for that day
  - Persona-specific recommendations
  - Historical comparisons
- **Unlock Progress (if <60 days of data):** Progress bar showing how many more days until predictions activate, with encouraging message

### 6.5 Pattern Dashboard

**Purpose:** The signature analytical screen. Where the magic becomes visible.

**Layout:**
- **Chart Area (top 60% of screen):**
  - Multi-layered timeline chart (see Section 3.4 for full description)
  - Time range selector: 1 month / 2 months / 3 months / cycle view
  - Layer toggle pills: Energy / Confidence / Events / Sleep / Stress / Cycle
  - Pinch-to-zoom and swipe navigation
- **Cycle Overlay Toggle:** Switch between chronological view and cycle-stacked view (aligns multiple cycles by cycle day)
- **Pattern Summary Cards (bottom 40%, scrollable):**
  - Top 3-5 AI-identified patterns as cards
  - Each card: headline, detail, mini-visualization, confidence score, feedback buttons
  - "See all patterns" link to a full pattern library
- **Filter Controls:** Filter patterns by persona, time range, or data type

### 6.6 Insights Feed

**Purpose:** A scrollable feed of AI-generated observations and recommendations.

**Layout:**
- **Feed of Insight Cards,** most recent first
- Each card contains:
  - Category tag (Correlation, Trend, Anomaly, Actionable, Cross-Domain)
  - Headline in bold
  - 2-3 sentence detail
  - Mini-chart or data visualization supporting the insight
  - Feedback: "Helpful" / "Not relevant" buttons
  - Share button (generates a privacy-safe shareable snippet)
- **Filter Tabs:** All / By Persona / Starred / Actionable
- **Empty State (early days):** "Insights appear here as patterns emerge. Keep checking in -- your first insight is [X] days away."

### 6.7 Profile and Settings

**Layout:**
- **Profile Section:**
  - Name, email, account details
  - Active personas with edit option
  - Cycle settings (tracking on/off, cycle length, last period date)
- **Notification Preferences:**
  - Individual toggles for each notification type
  - Quiet hours
  - Preferred check-in time
- **Privacy and Data:**
  - Data export (full data download)
  - Delete my data (with confirmation flow)
  - View shared access (who has Coach Mode or Team Mode access)
  - Encryption status indicator
- **Subscription:**
  - Current plan
  - Upgrade/downgrade
  - Billing history
- **About:**
  - Version info
  - Privacy policy
  - Terms of service
  - Support/contact

### 6.8 Integrations Screen

**Layout:**
- Grid or list of available integrations, each showing:
  - Service name and logo
  - Connection status (Connected / Not Connected / Coming Soon)
  - Last sync timestamp
  - Data types being synced
  - Toggle to enable/disable
- **Connected integrations** show a "Manage" button to adjust what data is synced
- **Coming Soon integrations** allow users to express interest (helps prioritize development)

### 6.9 Persona Setup / Edit Screen

**Layout:**
- Visual grid of persona tiles (same as onboarding)
- Currently selected personas are highlighted
- Tapping a new persona walks through 2-3 setup questions for that role
- Tapping a selected persona allows editing or removing it
- "Add Custom Hat" option for free-text persona creation
- Each persona shows the event types associated with it, which are editable

---

## 7. Data Model

### 7.1 Entity Relationship Overview

```
User
  |-- has many --> DailyCheckIn
  |-- has many --> Event
  |-- has many --> Pattern
  |-- has many --> Insight
  |-- has many --> Integration
  |-- has one  --> CycleData
  |-- has many --> Prediction
  |-- has many --> Persona
  |-- has many --> SharedAccess
```

### 7.2 Entity Definitions

#### User
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | string (encrypted) | Login email |
| first_name | string (encrypted) | Display name |
| last_name | string (encrypted, nullable) | Optional |
| auth_provider | enum | email, apple, google |
| created_at | timestamp | Account creation |
| last_active_at | timestamp | Last app open |
| timezone | string | User's local timezone |
| onboarding_completed | boolean | Whether onboarding flow is done |
| subscription_tier | enum | free, premium, team |
| notification_preferences | JSONB | All notification settings |
| check_in_time | time | Preferred daily check-in time |
| data_retention_consent | boolean | Explicit consent for data storage |
| encryption_key_hash | string | For client-side encryption verification |

#### Persona
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| type | enum | saleswoman, athlete, entrepreneur, mom, executive, creative, custom |
| custom_label | string (nullable) | For custom persona types |
| is_active | boolean | Whether currently selected |
| setup_answers | JSONB | Persona-specific onboarding answers |
| event_types | JSONB | Custom event types for this persona |
| created_at | timestamp | |

#### DailyCheckIn
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| date | date | The calendar date (one per user per day) |
| energy | integer (1-10) | Self-reported energy level |
| confidence | integer (1-10) | Self-reported confidence level |
| sleep_quality | integer (1-10, nullable) | Optional |
| stress_level | integer (1-10, nullable) | Optional |
| cycle_day | integer (nullable) | Day in current cycle, if tracked |
| notes | text (encrypted, nullable) | Free-text notes |
| completed_at | timestamp | When the check-in was submitted |
| edited_at | timestamp (nullable) | If edited after submission |
| source | enum | app, notification, widget |

**Unique Constraint:** (user_id, date) -- one check-in per user per day

#### Event
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| persona_id | UUID (nullable) | Foreign key to Persona |
| timestamp | timestamp | When the event occurred |
| date | date | Calendar date (indexed, for daily aggregation) |
| type | string | Event type label (e.g., "Closed a deal") |
| category | enum | sales, fitness, business, family, leadership, creative, custom |
| outcome_rating | enum (nullable) | great, okay, tough |
| notes | text (encrypted, nullable) | Optional notes |
| metadata | JSONB (encrypted, nullable) | Flexible data (deal value, PR weight, etc.) |
| source | enum | manual, calendar, crm, fitness_tracker |
| external_id | string (nullable) | ID from source system for deduplication |
| created_at | timestamp | |

#### CycleData
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User (unique -- one record per user) |
| tracking_enabled | boolean | Whether user opted into cycle tracking |
| average_cycle_length | integer (nullable) | In days |
| last_period_start | date (encrypted, nullable) | Most recent period start date |
| birth_control_type | string (encrypted, nullable) | If applicable |
| cycle_regularity | enum | regular, irregular, unknown, not_applicable |
| updated_at | timestamp | |

#### CycleEntry
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| cycle_start_date | date (encrypted) | First day of this cycle |
| cycle_length | integer (nullable) | Actual length in days (filled when cycle ends) |
| predicted_phases | JSONB (nullable) | Predicted follicular, ovulatory, luteal, menstrual day ranges |
| is_predicted | boolean | Whether this entry is a prediction or actual |
| created_at | timestamp | |

#### Pattern
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| pattern_type | enum | cycle_correlation, cross_domain, trend, behavioral, temporal |
| category | enum (nullable) | Which persona or life domain |
| description | text | Human-readable pattern description |
| confidence_score | float (0.0-1.0) | Statistical confidence |
| data_points_count | integer | Number of data points supporting this pattern |
| variables | JSONB | The specific variables involved (e.g., ["energy", "cycle_day", "sales_close"]) |
| statistical_details | JSONB | p-values, correlation coefficients, etc. |
| user_feedback | enum (nullable) | confirmed, denied, no_response |
| first_detected_at | timestamp | When the pattern was first identified |
| last_validated_at | timestamp | Last time the pattern was re-confirmed with new data |
| is_active | boolean | Whether the pattern still holds with recent data |
| superseded_by | UUID (nullable) | If a more refined pattern replaced this one |

#### Insight
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| pattern_id | UUID (nullable) | Foreign key to Pattern (if insight is derived from a pattern) |
| generated_at | timestamp | When the insight was created |
| content_headline | string | Short headline |
| content_body | text | Full insight text |
| content_visualization | JSONB (nullable) | Data for the mini-chart |
| category | enum | correlation, trend, anomaly, actionable, cross_domain |
| relevance_score | float (0.0-1.0) | How relevant to the user right now |
| novelty_score | float (0.0-1.0) | How new/surprising this insight is |
| persona_tags | JSONB | Which personas this insight is relevant to |
| user_feedback | enum (nullable) | helpful, not_relevant, no_response |
| is_read | boolean | Whether the user has seen it |
| delivered_via | enum (nullable) | feed, push_notification, weekly_briefing |

#### Prediction
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| date | date | The date being predicted |
| predicted_energy | float (1.0-10.0) | Predicted energy level |
| predicted_confidence | float (1.0-10.0) | Predicted confidence level |
| prediction_confidence | float (0.0-1.0) | How confident the model is in this prediction |
| signals | JSONB | Array of signal flags (e.g., ["high_performance_window", "creative_peak"]) |
| recommended_activities | JSONB | Persona-specific recommendations |
| contributing_factors | JSONB | What data points drove this prediction |
| actual_energy | integer (nullable) | Filled in after check-in for model evaluation |
| actual_confidence | integer (nullable) | Filled in after check-in for model evaluation |
| prediction_error | float (nullable) | Calculated after actuals are known |
| generated_at | timestamp | When prediction was created |
| model_version | string | Which version of the prediction model was used |

#### Integration
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| type | enum | google_calendar, apple_calendar, outlook, apple_health, garmin, whoop, oura, hubspot, salesforce |
| status | enum | connected, disconnected, error, pending |
| credentials | text (encrypted) | OAuth tokens or API keys |
| last_sync_at | timestamp (nullable) | Last successful data sync |
| sync_frequency | enum | realtime, hourly, daily |
| data_permissions | JSONB | What data types the user has authorized |
| error_log | JSONB (nullable) | Most recent errors |
| created_at | timestamp | |

#### SharedAccess
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User (the data owner) |
| recipient_email | string (encrypted) | Who has access |
| access_type | enum | coach, team_manager, medical, custom |
| data_categories | JSONB | What data is shared (e.g., ["energy_trends", "fitness_data"]) |
| expires_at | timestamp (nullable) | Auto-revoke date |
| is_active | boolean | Whether access is currently active |
| created_at | timestamp | |
| revoked_at | timestamp (nullable) | |

### 7.3 Indexing Strategy

**Time-series optimized indexes:**
- DailyCheckIn: (user_id, date) -- primary query pattern
- Event: (user_id, date), (user_id, category, date)
- Prediction: (user_id, date)
- CycleEntry: (user_id, cycle_start_date)

**Analytics indexes:**
- Pattern: (user_id, is_active, confidence_score)
- Insight: (user_id, is_read, generated_at)

**All tables** include created_at with default timezone-aware timestamps.

---

## 8. Tech Stack Recommendation

### 8.1 Frontend

**Recommendation: React Native with Expo**

**Rationale:**
- Single codebase for iOS and Android
- Expo provides managed workflow for push notifications, OTA updates, and build pipelines
- Large ecosystem of libraries for charts (react-native-chart-kit, Victory Native), sliders, and animations
- React Native Reanimated for smooth slider interactions (critical for the check-in UX)
- Expo Router for file-based navigation
- Strong TypeScript support

**Alternatives Considered:**
- Flutter: Strong option, but smaller hiring pool and less mature ecosystem for health/fitness integrations on iOS
- Native (Swift + Kotlin): Best performance, but doubles development cost and timeline

**Key Libraries:**
- `react-native-reanimated` -- slider animations
- `victory-native` or `react-native-chart-kit` -- pattern dashboard charts
- `react-native-gesture-handler` -- pinch-to-zoom on charts
- `expo-notifications` -- push notifications
- `expo-calendar` -- calendar integration
- `react-native-health` -- Apple HealthKit integration
- `@react-native-async-storage/async-storage` -- local caching

### 8.2 Backend

**Recommendation: Python / FastAPI**

**Rationale:**
- Python is the natural language for the ML/AI pipeline (scikit-learn, pandas, numpy)
- FastAPI is high-performance, async-native, and has excellent OpenAPI documentation
- Single language for API and ML means no serialization boundary between the prediction engine and the API layer
- Strong ecosystem for data processing and statistical analysis

**Alternatives Considered:**
- Node.js/Express: Faster for pure API development, but would require a separate Python service for ML
- Django: More batteries-included, but heavier than needed; FastAPI's async model is better for this workload

**Architecture:**
- FastAPI application with modular routers (auth, checkins, events, patterns, insights, predictions, integrations)
- Celery + Redis for background job processing (sync integrations, generate patterns, create predictions)
- ML pipeline as a separate module called by Celery workers
- WebSocket support (FastAPI native) for real-time sync if needed later

### 8.3 Database

**Recommendation: PostgreSQL + TimescaleDB extension**

**Rationale:**
- PostgreSQL for relational data (users, personas, integrations, shared access)
- TimescaleDB extension for time-series data (check-ins, events, predictions, integration sync data)
- TimescaleDB hypertables provide automatic partitioning by time, compression for older data, and optimized time-range queries
- JSONB columns in PostgreSQL handle flexible/semi-structured data (metadata, settings, statistical details)
- Strong encryption support (pgcrypto for column-level encryption)

**Schema Partitioning:**
- DailyCheckIn, Event, Prediction: TimescaleDB hypertables partitioned by date
- User, Persona, Integration, SharedAccess: Standard PostgreSQL tables
- Pattern, Insight: Standard PostgreSQL tables with time-based indexes

**Hosting:** Supabase (managed PostgreSQL with built-in auth, real-time subscriptions, and row-level security) or AWS RDS

### 8.4 AI / ML Pipeline

**Recommendation: Python-native ML stack**

**Phase 1 (MVP):**
- **scikit-learn** for pattern detection:
  - Correlation analysis (Pearson/Spearman) between check-in values and events
  - Time-series decomposition for energy/confidence rhythms
  - Simple regression models for initial predictions
- **pandas** for data transformation and feature engineering
- **scipy.stats** for statistical significance testing (only surface patterns above confidence thresholds)

**Phase 2:**
- **Prophet (Meta)** or **NeuralProphet** for time-series forecasting (energy and confidence predictions)
- Custom models trained per-user (lightweight -- each user's dataset is small enough for per-user models)
- Bayesian optimization for personalizing prediction weights

**Phase 3:**
- **LLM integration** (GPT-4 / Claude API) for natural-language insight generation
- Custom embeddings for pattern similarity across anonymized users ("women like you")
- Federated learning exploration for community insights without centralizing data

**Model Serving:**
- Models are trained as background jobs (Celery) and cached per-user
- Predictions are generated nightly or on-demand
- Model versioning for A/B testing prediction accuracy

### 8.5 Authentication

**Recommendation: Supabase Auth**

**Rationale:**
- Built-in support for email, Apple, and Google OAuth
- Row-level security (RLS) policies in PostgreSQL ensure users can only access their own data
- JWT-based with refresh tokens
- MFA support for sensitive health data
- If not using Supabase for database, Firebase Auth is the alternative

### 8.6 File Storage

**Recommendation: Supabase Storage or AWS S3**

**Use Cases:**
- Exported PDF reports
- Profile images (if added later)
- ML model artifacts (per-user model weights)
- Backup/export data files

### 8.7 Analytics

**Recommendation: Mixpanel**

**Tracked Events:**
- Check-in completion rate and time
- Feature usage (which screens, which features)
- Retention cohorts (7-day, 30-day, 90-day)
- Notification engagement rates
- Integration connection rates
- Subscription conversion events

**Alternatives:** Amplitude (more enterprise-focused), PostHog (open-source, self-hosted option for privacy)

**Critical Rule:** Analytics must never capture or transmit health data. Analytics events track feature usage only -- never slider values, cycle data, or personal health metrics.

### 8.8 Push Notifications

**Recommendation: Firebase Cloud Messaging (FCM) via Expo Notifications**

- Cross-platform (iOS APNs + Android FCM) through a single API
- Scheduled notifications for morning check-in reminders
- Segmented notifications for weekly briefings and insight alerts
- Notification preferences synced with backend to respect user settings

### 8.9 Privacy and Security Infrastructure

- **Encryption at rest:** AES-256 for all database fields marked as encrypted in the data model
- **Encryption in transit:** TLS 1.3 for all API communication
- **Client-side encryption option (Phase 2):** For highest-sensitivity fields (cycle data, notes), encrypt on-device before transmission so the server never sees plaintext
- **Key management:** AWS KMS or HashiCorp Vault
- **Audit logging:** All data access events logged (who accessed what, when)
- **Data residency:** Host in US initially with option for EU hosting for GDPR compliance
- **Penetration testing:** Quarterly, starting before public launch

---

## 9. MVP Scope and Priorities

### 9.1 What Is In v1 (The Minimum to Validate)

**Core Loop (Must Ship):**
1. Account creation (email + social auth)
2. Persona selection (6 preset + custom)
3. Cycle context setup (3 paths: track, irregular/BC, skip)
4. Daily check-in (energy + confidence sliders, 10 seconds)
5. Optional check-in expansion (sleep, stress, cycle day, notes)
6. Quick-log events (pre-configured per persona + custom)
7. Basic trend visualization (energy and confidence over time)
8. Calendar integration (Google Calendar minimum; Apple Calendar stretch)
9. Morning check-in notification
10. Weekly briefing notification

**Intelligence Layer (Must Ship):**
1. Pattern detection engine (correlations between check-in data and events)
2. Cycle overlay on pattern dashboard (for users who track)
3. Initial insight cards (minimum 5 insight types, generated after 30+ days of data)
4. Pattern Dashboard (multi-layer chart with toggle controls)

**Prediction Layer (Must Ship, Even If Basic):**
1. Week-Ahead View with predicted energy and confidence
2. Signal flags (high-performance window, creative peak, recovery zone)
3. Prediction confidence indicators
4. Prediction activated after 60+ days of data

**Infrastructure (Must Ship):**
1. User authentication and authorization
2. Encrypted data storage
3. Push notification system
4. Data export (CSV)
5. Account deletion
6. Privacy policy and terms of service

### 9.2 What Is Explicitly Out of v1

- CRM integration (HubSpot, Salesforce)
- Fitness tracker integration (Apple Health, Garmin, Whoop, Oura)
- Wearable data sync (HRV, sleep stages)
- Team Mode
- Coach Mode
- Shareable reports (PDF)
- Advanced AI coaching
- Community features
- Marketplace
- Enterprise licensing
- API
- Longitudinal health insights / anomaly detection
- Android (launch iOS-first, unless React Native parity is trivial)
- In-app purchase / subscription (can launch with a waitlist or beta access model initially)
- Outlook calendar integration

### 9.3 Success Metrics

**Primary Metrics (North Stars):**

| Metric | Target (90 Days Post-Launch) | Measurement |
|--------|------------------------------|-------------|
| Daily Active Users (DAU) | 500+ | Unique users opening app daily |
| Check-in completion rate | 70%+ of DAU complete daily check-in | Check-ins / DAU |
| 30-day retention | 40%+ | Users active on day 30 who were active on day 1 |
| 60-day retention | 30%+ | Users active on day 60 who were active on day 1 |
| 90-day retention | 25%+ | Users active on day 90 who were active on day 1 |

**Secondary Metrics:**

| Metric | Target | Notes |
|--------|--------|-------|
| Onboarding completion rate | 80%+ | Users who finish all onboarding steps |
| Persona selection | Average 2.3+ personas per user | Validates the "many hats" hypothesis |
| Cycle tracking opt-in | 60%+ of users | Validates that most women will share this data in a trusted context |
| Quick-log events per user per week | 3+ | Indicates engagement beyond check-in |
| Insight card engagement | 50%+ read rate, 20%+ feedback rate | Users find insights relevant |
| NPS | 50+ | Net Promoter Score from in-app survey at day 30 |
| Week-Ahead View usage | 60%+ of eligible users check weekly | Validates the predictive value proposition |
| Time to complete check-in | Under 15 seconds median | Validates the "10-second" promise |

**Qualitative Metrics:**
- User interviews at 30 and 60 days (minimum 20 users per cohort)
- Pattern accuracy self-reports ("Does this pattern feel right?" feedback)
- Prediction accuracy tracking (predicted vs. actual energy/confidence, targeting within 1.5 points)
- Open-ended feedback on insight usefulness

---

## 10. Privacy and Ethics

### 10.1 Threat Model

This application collects and correlates some of the most sensitive personal data imaginable:
- Menstrual cycle data (reproductive health)
- Daily emotional and physical states (mental health proxy)
- Professional performance metrics (career-sensitive)
- Location and scheduling data (via calendar)
- Physiological data (via wearable integrations)

**In the post-Dobbs legal environment in the United States, menstrual cycle data has potential legal implications.** This is not theoretical. Law enforcement agencies have subpoenaed period tracking data. This product must be architected from day one to protect users even in adversarial legal scenarios.

### 10.2 Privacy Architecture

**Principle: Collect the minimum, encrypt everything, and make it deletable.**

1. **End-to-end encryption for all health data:**
   - Cycle data, check-in values, events with health metadata, and free-text notes are encrypted with user-held keys
   - The server stores ciphertext only for these fields
   - Even in a data breach or legal subpoena, the plaintext is not accessible without the user's key
   - Key derivation from user password + device-specific salt

2. **Data minimization:**
   - Calendar integration processes event metadata locally on-device where possible; only aggregated signals (meeting count, total meeting hours) are sent to the server
   - Event titles from calendars are categorized on-device and the raw title is never stored server-side
   - No GPS or location data is collected -- ever

3. **User data ownership:**
   - Full data export available at any time (CSV and JSON formats)
   - Complete account and data deletion available at any time, executed within 24 hours
   - Deletion is real deletion (not soft-delete), including all backups within 30 days
   - Confirmation email sent when deletion is complete

4. **No data monetization:**
   - User data is never sold, licensed, or shared with advertisers
   - User data is never used to train models for other users without explicit, informed, revocable opt-in
   - This commitment is in the terms of service and is a binding legal obligation

5. **Anonymization for aggregate features (Phase 3):**
   - Any "women like you" or community features use differential privacy techniques
   - k-anonymity (minimum group size of 50) before any aggregate statistic is surfaced
   - No individual's data can be reconstructed from aggregate outputs

6. **Access controls:**
   - Team Mode and Coach Mode require explicit, granular, revocable consent from the data owner
   - Team Mode aggregate views require minimum 5 team members (preventing manager from isolating individual patterns)
   - All shared access is logged in an audit trail visible to the data owner
   - Shared access auto-expires unless renewed

### 10.3 Legal and Compliance

- **HIPAA-adjacent practices** even though the app may not be legally classified as a covered entity:
  - Business Associate Agreements with all infrastructure providers
  - Annual security audits
  - Incident response plan
  - Employee access controls and training
- **GDPR compliance** for any EU users:
  - Data Processing Agreement
  - Right to access, rectification, erasure, and portability
  - Data Protection Impact Assessment (DPIA) completed before launch
  - EU data residency option
- **CCPA compliance** for California users
- **Transparency report** published annually detailing any government data requests received and how they were handled
- **Warrant canary** maintained (removed if a gag order is received)

### 10.4 Ethical Guidelines for AI

1. **No prescriptive limitations:** The AI never tells a user she cannot or should not do something. It provides information; she makes decisions.
2. **No stereotyping:** Pattern detection is individual-only in MVP. Even in aggregate features (Phase 3), the system never makes generalizations about women as a group.
3. **Honest uncertainty:** Predictions always carry confidence scores. Low-confidence predictions are clearly labeled. The system never overstates its certainty.
4. **Bias monitoring:** Regular audits of the insight generation system to ensure it does not develop biases based on user demographics.
5. **No dark patterns:** Notifications are never designed to create anxiety. Streaks are presented as information, not guilt. The app never punishes missed days.

---

## 11. Business Model

### 11.1 Pricing Tiers

#### Free Tier
- Daily check-in (energy + confidence)
- Quick-log events (up to 5 per day)
- Basic trend visualization (last 14 days)
- 1 calendar integration
- Morning check-in notification
- Access to pattern dashboard (limited: last 30 days, no cycle overlay)

**Purpose:** Free tier must be genuinely useful, not a crippled teaser. It validates the daily check-in habit and gives enough value to hook the user. The upgrade path is unlocking the intelligence layer.

#### Premium -- $9.99 - $14.99/month (or $89.99 - $129.99/year)
- Everything in Free, plus:
- Full pattern dashboard (unlimited history, cycle overlay, all layers)
- AI-generated insight cards
- Week-Ahead predictive view
- Unlimited quick-log events
- All calendar integrations
- Fitness tracker integrations (Phase 2)
- Wearable data sync (Phase 2)
- Advanced AI coaching (Phase 2)
- Data export (CSV, PDF reports)
- Priority support

**Suggested Launch Price:** $9.99/month or $89.99/year (annual = 25% discount, incentivizes commitment and aligns with the "gets smarter over time" value proposition)

#### Teams -- $19.99/user/month
- Everything in Premium for each team member, plus:
- Manager dashboard with aggregate team capacity
- Team scheduling optimization
- Consent-managed data sharing
- Admin controls (add/remove members, view aggregate analytics)
- Minimum 5 users per team
- Dedicated onboarding support

**Target Customers:** Sales teams, coaching organizations, athletic programs, wellness-forward companies

#### Enterprise -- Custom Pricing
- Everything in Teams, plus:
- Custom integrations
- SSO (SAML/OIDC)
- Dedicated success manager
- Custom analytics and reporting
- SLA guarantees
- On-premise deployment option (for regulated industries)
- Minimum 25 users

### 11.2 Revenue Projections (Illustrative)

These projections are intentionally conservative and are included for planning purposes, not as commitments.

**Assumptions:**
- iOS-only launch, US market initially
- 6-month beta with 500 users, public launch at month 7
- Freemium conversion rate: 8% (month 1) growing to 15% (month 12) as intelligence features prove value
- Monthly churn on premium: 5% (month 1-3), declining to 3% (month 6+) as data accumulation increases switching cost
- No team/enterprise revenue in year 1

| Month | Total Users | Premium Users | MRR |
|-------|------------|---------------|-----|
| 7 (Launch) | 2,000 | 160 | $1,600 |
| 9 | 5,000 | 500 | $5,000 |
| 12 | 15,000 | 1,875 | $18,750 |
| 18 | 50,000 | 7,500 | $75,000 |

### 11.3 Unit Economics

- **CAC target:** Under $15 (organic/content-driven growth, influencer partnerships, PR)
- **LTV target:** $120+ (12-month average retention at $9.99/month)
- **LTV:CAC ratio target:** 8:1+
- **Payback period target:** Under 2 months

### 11.4 Growth Strategy

1. **Content marketing:** Blog, podcast appearances, and social media focused on female performance optimization (not period tracking -- positioning matters)
2. **Influencer partnerships:** Female athletes, entrepreneurs, and sales leaders who can authentically speak to the "many hats" experience
3. **PR:** The "first performance intelligence tool built for female biology" angle is newsworthy
4. **Community-led growth (Phase 3):** Shareable insights, anonymized pattern stories, referral program
5. **B2B motion (Phase 2+):** Sales team managers, executive coaches, athletic programs as channel partners

---

## 12. Competitive Landscape

### 12.1 Direct Competitors

#### Period Trackers: Flo, Clue, Natural Cycles

| Dimension | Flo / Clue / Natural Cycles | PeakHer |
|-----------|------------------------------|---------|
| Core function | Cycle tracking and fertility | Performance intelligence |
| Performance data | None | Multi-domain (sales, fitness, leadership, creativity, parenting) |
| Predictive intelligence | Cycle predictions only | Energy, confidence, and performance predictions across all life domains |
| Personalization | Generic phase-based advice | Individual pattern recognition from her own data |
| Works without cycle data | No | Yes -- energy patterns emerge regardless |
| Target user | Women tracking fertility or cycle health | Women optimizing performance across all roles |

**Key Differentiator:** PeakHer is not a period tracker that added performance features. It is a performance tool that includes cycle data as one signal among many. The positioning, UX, and value proposition are fundamentally different.

#### Female Performance Apps: Wild.AI

| Dimension | Wild.AI | PeakHer |
|-----------|---------|---------|
| Core function | Cycle-aware athletic training | Whole-life performance intelligence |
| Domains covered | Fitness only | Sales, fitness, business, family, leadership, creativity |
| User identity | Athlete | The whole woman (who may also be an athlete) |
| Data model | Training + cycle | Check-ins + events + calendar + CRM + fitness + cycle |
| Prescriptive vs. descriptive | Prescriptive (tells you what to do in each phase) | Descriptive and predictive (shows you YOUR patterns) |

**Key Differentiator:** Wild.AI serves female athletes. PeakHer serves the female athlete who is also a sales director and a mom. The multi-domain approach is the moat.

#### Productivity / Wellness Hybrids: Phase, Closer, Essence

| Dimension | Phase / Closer / Essence | PeakHer |
|-----------|--------------------------|---------|
| Approach | Prescriptive phase-based productivity tips | Data-driven individual pattern discovery |
| Data collection | Minimal (cycle day + maybe mood) | Rich (energy, confidence, events, calendar, integrations) |
| Performance analytics | None (no outcome tracking) | Correlates actual performance outcomes to biological and behavioral patterns |
| Personalization | Generic phase advice | Unique to each woman based on her accumulated data |
| Multi-domain | Generally single-domain | Full life coverage |

**Key Differentiator:** These apps essentially put a menstrual cycle calendar next to generic advice. PeakHer builds a personalized performance model from real data. It is a fundamentally different product category.

#### Biometric Platforms: Whoop, Oura

| Dimension | Whoop / Oura | PeakHer |
|-----------|-------------|---------|
| Core function | Biometric tracking (HRV, sleep, recovery) | Performance intelligence across life domains |
| Cycle intelligence | Whoop added basic cycle tracking | Cycle is one signal in a multi-signal model |
| Performance tracking | Fitness/recovery only | Sales, creativity, leadership, parenting, fitness |
| Self-reported data | Minimal | Central (energy, confidence, events) -- validated against biometric data when available |
| Requires hardware | Yes ($30/mo for Whoop, $300+ for Oura ring) | No (optional integration with these devices adds value but is not required) |
| Life context | None (no calendar, no work data, no family data) | Full life context |

**Key Differentiator:** Whoop and Oura measure what your body does. PeakHer measures what your body does, what you accomplish, and how those correlate. They are complementary, not competitive -- and PeakHer integrates with both.

### 12.2 Competitive Moat

1. **Data network effect:** Every day of data makes the product more valuable and harder to switch away from. After 6 months, a user's pattern library is irreplaceable.
2. **Multi-domain model:** No competitor tracks performance across sales, fitness, parenting, creativity, and leadership simultaneously. Building this requires a fundamentally different data model and ML pipeline.
3. **Individual pattern recognition:** Competitors offer generic advice based on cycle phase. PeakHer builds a unique model per user. This requires time (data accumulation) and sophistication (per-user ML models) that is difficult to replicate quickly.
4. **Trust and privacy:** In a post-Dobbs environment, the first platform to earn genuine trust with this data category will have a durable advantage. Trust is harder to build than features.
5. **Persona flexibility:** The "many hats" framework is extensible. New personas and integrations can be added without changing the core architecture. Competitors locked into a single domain (fitness, fertility) would have to rebuild.

---

## Appendix: Target Personas

PeakHer is designed around the insight that most women do not live in a single role. The persona system is not about market segmentation -- it is about acknowledging the full complexity of a woman's life and tracking performance across all of it.

Most users will select 2-3 personas. The combination is what makes PeakHer unique.

### Persona 1: Saleswoman / Business Development

**Who she is:** Account executive, SDR, business development rep, real estate agent, financial advisor, or anyone whose income is tied to closing deals and building relationships.

**What she tracks:**
- Deals closed (date, value)
- Calls booked and completed
- Pipeline movement
- Revenue events
- Presentation quality
- Negotiation outcomes

**What she discovers:**
- Which cycle days (or energy levels) correlate with her highest close rates
- Whether morning or afternoon calls perform better at different points in her rhythm
- The relationship between sleep, exercise, and sales confidence
- Her optimal "push" windows for prospecting vs. relationship-building vs. closing

**Key Insight Example:** "Your close rate is 2.3x higher during days 8-14 of your cycle. 78% of your deals over $50K closed during your predicted high-performance windows. You have 3 prospect calls scheduled next Tuesday, which is historically your lowest-confidence day -- consider moving them to Wednesday."

### Persona 2: Athlete / Fitness

**Who she is:** Competitive or recreational athlete, CrossFit enthusiast, runner, lifter, yogi, or any woman serious about physical performance.

**What she tracks:**
- Workout quality (subjective)
- New PRs
- Perceived exertion
- Recovery days
- Training volume

**What she discovers:**
- When her body is primed for strength vs. endurance vs. flexibility
- How her cycle affects recovery time
- The relationship between training and professional/creative performance
- Her injury risk windows (historically higher-strain periods)

**Key Insight Example:** "Your deadlift PRs cluster around days 10-16 of your cycle. Your perceived exertion is 25% higher for the same workout intensity during days 22-28. Morning workouts on high-energy days correlate with 18% better afternoon work performance."

### Persona 3: Entrepreneur / Business Owner

**Who she is:** Founder, small business owner, freelancer, or side-hustler managing multiple priorities with no one to delegate to.

**What she tracks:**
- Launches and milestones
- Creative output
- Decision quality (self-assessed)
- Revenue events
- Strategic thinking sessions

**What she discovers:**
- When she is best at generating new ideas vs. executing existing plans
- How her energy rhythms affect decision quality
- Her optimal launch timing
- The relationship between rest and creative breakthroughs

**Key Insight Example:** "Your 'creative breakthrough' events happen 3x more often during days 6-12. But your 'good decision' ratings peak during days 16-20, when your energy is moderate but your analytical clarity is highest. Consider separating ideation and decision-making into different windows."

### Persona 4: Mom / Caregiver

**Who she is:** Any woman responsible for children, aging parents, or other caregiving roles.

**What she tracks:**
- Patience level
- Energy for kids/family
- "Good day" ratings
- Quality time logged
- Overwhelm moments

**What she discovers:**
- How her biological rhythms affect her capacity for patience and presence
- Which days she should ask for help or lower her own expectations
- The relationship between self-care and parenting quality
- Seasonal and cyclical patterns in family dynamics

**Key Insight Example:** "Your 'patience' ratings drop 35% during days 24-28 of your cycle, which is also when your stress scores peak. On those days, having evening childcare help correlates with a 2-point recovery in next-day energy. This is not a failure -- it is a pattern, and now you can plan for it."

### Persona 5: Executive / Leader

**Who she is:** VP, director, C-suite, board member, or any woman in a leadership role making high-stakes decisions.

**What she tracks:**
- Presentation quality
- Negotiation outcomes
- Strategic clarity (self-assessed)
- Meeting effectiveness
- Difficult conversation outcomes

**What she discovers:**
- When she is at her most persuasive and commanding
- How meeting load affects decision quality
- Her optimal windows for board presentations, negotiations, and strategic planning
- The relationship between preparation timing and outcome quality

**Key Insight Example:** "Your 'strong presentation' ratings are 40% higher when the presentation falls during days 8-14 AND you prepped materials 2+ days in advance. Preparation during low-energy days still leads to great outcomes -- suggesting your prep quality is consistent but your delivery varies with energy."

### Persona 6: Creative

**Who she is:** Writer, designer, artist, musician, content creator, or any woman whose work involves creative output.

**What she tracks:**
- Flow states
- Writing/creative output volume
- Inspiration moments
- Project completions
- Creative blocks

**What she discovers:**
- Her creative rhythm (when inspiration and flow are most accessible)
- The conditions that precede creative blocks
- How physical activity, sleep, and stress affect creative output
- Whether her creativity follows her cycle, her schedule, or both

**Key Insight Example:** "Your flow states cluster on days 7-13 of your cycle and are 60% more likely to occur on days when you exercised before noon and had fewer than 3 meetings. You've scheduled 5 meetings next Tuesday, which is predicted to be a peak creative day. Consider protecting that time."

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-11 | Product Team | Initial comprehensive specification |

---

*This document is confidential and intended for internal use by the development team. Distribution outside the core team requires explicit approval.*
