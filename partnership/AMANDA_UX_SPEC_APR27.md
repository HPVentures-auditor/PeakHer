# PeakHer UX Improvement Spec
## For Dev Team — All Issues, Fixes, and Prioritization
### April 2026

---

## CORE PRINCIPLE

PeakHer asks for data before giving value. This kills retention.

The app currently says "We need 30 check-ins to learn your patterns." That means: give us a month of your life before we give you anything useful. No user does that. They open the app, see an empty state, and never come back.

THE FIX: Give value from Day 1 with whatever data you have. A woman who enters her last period date and average cycle length has given you enough to estimate her current phase, predict her next period, and generate a basic daily brief. It won't be as accurate as 30 check-ins. It doesn't need to be. It needs to be useful enough that she comes back tomorrow.

GOLDEN RULE: Value First, Accuracy Later.

How Flo does it: Log one period and Flo immediately predicts your next period, ovulation day, and fertile window. Accuracy improves over time but value is instant.

How Oura does it: First night wearing the ring gives you a Readiness Score. It's rough but it's something.

How PeakHer should do it: Enter your last period date and cycle length. Immediately see: your current phase (Restore, Rise, Peak, or Sustain), today's basic do's/don'ts for movement and nutrition, Dot's take on today, and a preview of your week ahead. All from Day 1.

---

## CRITICAL ISSUES (P0 — Ship This Week)

### Issue 1: Empty state on "Week Ahead" kills first-session retention

PROBLEM: User opens "Week Ahead" tab and sees a crystal ball emoji, "We need 30 check-ins to learn your patterns and generate reliable predictions," and a progress bar at 13% (4 of 30). The user gets NOTHING. The most interesting tab in the app is a dead end. Apps with empty states that provide no value see 60-80% first-session drop-off.

FIX: Generate estimates immediately from period date + cycle length. If a user entered her last period date as March 25 and her average cycle length as 28 days, you can calculate:
- Her current phase (she's on Day 25 = Sustain)
- Estimated next period (April 22)
- Estimated ovulation (around April 8)
- When Rise begins (around April 27)
- When Peak begins (around May 5)

Show ALL of this on Day 1. Label it: "Based on your cycle data. Gets smarter with every check-in."

Week Ahead tab should show:
1. CURRENT PHASE INDICATOR (always visible): "🍂 Sustain - Day 25 of 28" with phase-colored progress bar
2. THIS WEEK'S OVERVIEW: 7-day strip showing each day's estimated phase, colored by phase (purple, green, gold, coral). "Sustain through Wednesday, then Restore begins Thursday"
3. DAILY CARDS (one per day): Phase name + emoji, Brain mode (Sharp/Magnetic/Architect/Visionary), Energy estimate (1-10), One-line Dot take, Movement recommendation
4. ACCURACY INDICATOR (small, bottom, supplementary): "Based on cycle data. 4 of 30 check-ins completed."

The accuracy indicator is a FOOTNOTE, not the headline.

---

### Issue 2: Current phase not shown anywhere in the app

PROBLEM: The single most important piece of information, "What phase am I in right now?" is not visible anywhere. This is like a weather app that doesn't show the current temperature.

FIX: Show current phase prominently on EVERY tab. Either as a persistent header or as the hero element on the home screen.

Display: Phase emoji + phase name + day number + phase color
Example: "🍂 Sustain, Day 25" with coral accent

Calculated from period date and cycle length from Day 1. No check-ins required.

Phase indicator should appear:
1. TOP OF CHECK-IN TAB (hero position): Large phase emoji + "You're in Sustain" + "Day 25 of 28" + "~3 days to Restore"
2. PERSISTENT HEADER ON ALL TABS: Small but always visible: "🍂 Sustain · Day 25"
3. INSIDE EVERY DAILY BRIEF: Phase context at top before any recommendations

Phase names are proprietary PeakHer names. NEVER clinical names:
- Restore (menstrual) 🌙 #9B30FF
- Rise (follicular) 🌱 #00E5A0
- Peak (ovulatory) ☀️ #FFD700
- Sustain (luteal) 🍂 #FF6B6B

---

### Issue 3: No actionable do's/don'ts based on current phase

PROBLEM: The app doesn't tell the user what to DO. No "do yoga today, skip HIIT." No "eat complex carbs, ease up on caffeine." No "good day for detail work, bad day for brainstorms." This is the entire value proposition and it's missing. Without do's/don'ts, PeakHer is just a tracker. There are 50 trackers already.

FIX: Generate phase-based recommendations from Day 1. These don't require 30 check-ins. They're based on hormonal science that applies to the phase itself.

Show on the Check-in/home screen:

TODAY'S GUIDANCE (based on current estimated phase):
- Movement: "Do: Pilates or walking. Skip: HIIT today." + one-line Dot reasoning
- Nutrition: "Eat: Complex carbs, magnesium, protein. Ease up: Excess caffeine, alcohol." + Dot take
- Calendar: "Good for: detail work, editing, organizing. Move if you can: brainstorms, pitches." + Dot take
- Fasting (if user practices IF): "14:10 today. Shorter fast in Sustain because cortisol is elevated."
- Dot's Daily Read: One paragraph explaining what hormones are doing today and what it means for how she'll feel. The screenshot moment. The thing she sends to her group chat.

All of this can be generated from phase alone. No check-in data required. Personalization makes it better over time, but baseline is useful from Day 1.

---

### Issue 4: No way to deactivate or delete account

PROBLEM: This is a LEGAL compliance issue. Apple's App Store requires apps to offer account deletion. GDPR requires it. CCPA requires it. Beyond compliance, if a user can't leave, she doesn't trust you with her data. Period/cycle data is among the most sensitive health data, especially post-Dobbs.

FIX: Add to Settings immediately:
1. "Deactivate Account" (pauses account, keeps data, can reactivate)
2. "Delete Account and All Data" (permanent deletion, all data wiped, confirmation required)

Both in Settings > Account > Manage Account. Clear language. No dark patterns. One confirmation, then done.

Apple will reject the app without this. Ship before any public launch or App Store submission.

---

### Issue 5: No immediate estimates from period date + cycle length

PROBLEM: User enters last period date and cycle length during onboarding. The app has enough data to estimate her current phase but doesn't. Instead it tells her to do 30 check-ins. She gave you the answer and you ignored it.

FIX: Calculate and display estimates immediately after onboarding.

Simple math:
- Last period: March 25
- Cycle length: 28 days
- Today: April 19
- Days since period start: 25
- Current estimated phase: Sustain (days 17-28)
- Next period: ~April 22 (3 days away)
- Next Rise: ~April 27

This is basic math. Do it instantly. Show the user her estimated cycle map, current phase, and daily guidance before she even completes her first check-in.

Label: "Estimated based on your cycle data. Accuracy improves with check-ins."

---

## HIGH PRIORITY ISSUES (P1 — Next 2-4 Weeks)

### Issue 6: Calendar integration broken

PROBLEM: Users can't connect their calendar. Calendar Intelligence is the #1 differentiating feature.

FIX:
1. Fix OAuth flow for Google Calendar and Outlook. One tap: "Connect Google Calendar" > Google sign-in > done. Test on iOS Safari and Chrome.
2. Provide calendar value even WITHOUT integration. Let users manually input top 3 meetings. "What's your biggest meeting today? What time?" Dot coaches that meeting based on current phase.

Support: Apple Calendar (CalDAV), Google Calendar (API), Outlook (Microsoft Graph).

---

### Issue 7: Whoop integration broken

PROBLEM: Whoop connection doesn't work. Users who own a Whoop are PeakHer's ideal power users.

FIX: Prioritize integrations by user base overlap:
1. Apple Health (highest priority): Covers 80%+ of users. Aggregates data from Apple Watch, Oura, Whoop, and most fitness apps. One integration, maximum coverage.
2. Oura (second): 59% female users. Well-documented API.
3. Whoop (third): Fix current integration. Apply for official partner API access.

For ALL integrations: clear error messages when connection fails. Never block the user. If integration fails, she should still use the full app with manual data.

---

### Issue 8: Diet/fasting/training schedule input and phase-matched adjustments

PROBLEM: Users can't share their current diet, fasting protocol, or training schedule. The app can't tell them how to ADJUST what they're already doing based on their phase.

FIX: During onboarding or in Settings, ask:
1. "Do you practice intermittent fasting?" If yes: "What's your usual protocol?" Then adjust daily.
2. "Do you follow a training schedule?" If yes: "What does a typical week look like?" Then overlay with phase recommendations. "Tuesday you have 'HIIT' scheduled. You'll be in Sustain. Consider swapping to Pilates."
3. "Any dietary preferences?" (Vegan, vegetarian, gluten-free, etc.) Nutrition recommendations respect her framework.

Key insight: She's not asking PeakHer to CREATE her plan. She's asking PeakHer to ADJUST what she already does based on her hormones.

---

### Issue 9: No task management integration or manual to-do sorting

PROBLEM: Users want to connect Asana, Apple Reminders, or other task managers for phase-sorted to-do lists.

FIX:
Phase 1 (no integration needed): Let users manually input top 5 to-dos. PeakHer sorts them into "Great for today" and "Consider moving" based on current phase. Keyword matching: "brainstorm," "create," "pitch" = Rise/Peak. "Review," "edit," "organize" = Sustain.

Phase 2 (with integration): Connect to Asana, Todoist, Apple Reminders. Pull task list. Auto-sort by phase.

Manual version ships first. No API dependency.

---

### Issue 10: Dot's personality is missing from the app

PROBLEM: The app is generic UI with no personality. Dot is nowhere. The brand's biggest differentiator is absent from the actual product.

FIX: Dot should be present in every screen:
1. Check-in tab: Dot greets you. Her avatar is visible.
2. Daily recommendations: Every do/don't includes a Dot one-liner in her voice.
3. Week Ahead: Dot's commentary on the upcoming week.
4. Empty states: When data is missing, Dot speaks. Never a generic error.
5. Notifications: Push notifications come FROM Dot, in her voice.

Dot is called "your Hormonal Intelligence assistant." NOT "AI." NOT "chatbot."

---

## FREE VS. PAID SUBSCRIPTION STRATEGY

### 2026 Benchmark Data
- Freemium conversion rate: 2-5%
- Free trial conversion rate: 18-60%
- Health/fitness monthly pricing: $14.99-$24.99
- Health/fitness annual pricing: $59.99-$99.99
- 67% of health app subscribers choose annual (highest of any category)
- 60-80% of purchases happen during/right after onboarding
- #1 conversion driver: access to full content (26% of upgrades)

### Free Tier (The Habit)
- Current phase indicator (where you are)
- Basic daily insight from Dot (one line, phase-general)
- Cycle progress bar + countdowns
- Daily check-in
- Basic movement do/don't (one recommendation)

### Premium Tier (The Intelligence)
Everything in free, PLUS:
- Full Daily Brief from Dot (all sections, personalized)
- Calendar Intelligence (meeting coaching by phase)
- To-Do Intelligence (task sorting by phase)
- Full nutrition guidance (eat this / ease up, with reasons)
- Fasting Intelligence (phase-adjusted IF window)
- Meeting Prep Coach (hormone-aware meeting briefing)
- Week Ahead predictions (7-day phase forecast)
- Patterns + Trends (cross-cycle analysis)
- Monthly PeakHer Wrapped (shareable recap)
- Wearable integrations (Oura, Whoop, Apple Watch)
- Calendar + task manager integrations

### Pricing
- Monthly: $14.99/month (the anchor, intentionally high)
- Annual: $79.99/year, presented as "Just $6.67/month," labeled "Most Popular" (55% savings vs. monthly)
- Founding Member (waitlist): Free Premium for life for first 1,000

### Paywall Flow

STEP 1: After onboarding, before first screen.
"Dot built your first brief. Want the full version?"
Primary CTA: "Start 7-day free trial" (big button)
Secondary: "Continue with free" (text link)

If trial: full Daily Brief for 7 days. Day 6 notification: "Trial ends tomorrow. 40% off your first year."
If free: free tier immediately. Daily indicators of what full brief includes. Tap to see paywall.

STEP 2: Contextual paywalls.
When she taps a Premium feature (Week Ahead, Calendar Intelligence), show preview with blurred/truncated content. "Start 7-day free trial to unlock."

STEP 3: Day 30 retention offer.
If free user still opening daily after 30 days: "You've checked in 30 times. Here's 50% off your first year. This offer won't come back."

PRINCIPLE: Free is for habit formation. Paid is for intelligence. Free makes her check the app daily. Paid makes her unable to imagine her day without it.

---

## INTEGRATION ROADMAP

Priority order:
1. P0: Apple Health (3 weeks) — covers 80%+ of users with one integration
2. P0: Google Calendar fix (2 weeks) — Calendar Intelligence is the #1 differentiator
3. P1: Oura Ring (6 weeks) — 59% female user base
4. P1: Whoop fix (4 weeks) — fix current broken integration
5. P1: Apple Calendar (4 weeks) — covers non-Google calendar users
6. P2: Outlook Calendar (8 weeks) — corporate users
7. P2: Asana (8 weeks) — task sorting by phase
8. P2: Apple Reminders (8 weeks) — native iOS task management
9. P2: Todoist (10 weeks) — popular task manager
10. P3: Peloton / Apple Fitness+ (12 weeks) — workout tracking overlay
11. P3: MyFitnessPal / Cronometer (12 weeks) — nutrition tracking overlay

INTEGRATION PRINCIPLE: Never block, always fallback. If integration fails or user doesn't connect, app provides full value through manual input. Integrations make it better. They're never required.

---

## IDEAL DAY 1 USER FLOW

1. DOWNLOAD + OPEN
Dot greets her: "Hey. I'm Dot. Your Hormonal Intelligence assistant. I'm about to change how you see your entire week. Let's start with one question."

2. ONBOARDING (Under 2 minutes, 5 questions max)
Q1: "When did your last period start?" (date picker)
Q2: "How long is your typical cycle?" (slider, default 28)
Q3: "Do you practice intermittent fasting?" (Y/N, if yes: protocol)
Q4: "What does a typical workout week look like?" (optional, skip OK)
Q5: "Any dietary preferences?" (multi-select, skip OK)

Dot: "That's all I need. Let me build your first brief."

PAYWALL APPEARS HERE: "Dot built your first brief. Want the full version?" Trial CTA or continue free.

3. FIRST SCREEN (Immediate value)
Large phase indicator: "🍂 You're in Sustain. Day 25."
Dot's Daily Read: "Your brain is in architect mode. Detail work will feel satisfying. Brainstorming will feel like pulling teeth. Lean in."

Below (full if Premium trial, basic if free):
Movement: "Do: Yoga or walking. Skip: HIIT (cortisol is elevated)"
Nutrition: "Your body is burning extra fuel. Complex carbs, magnesium, protein."
Calendar: "Good for: editing, organizing, closing loops. Move: brainstorms, pitches"
Fasting (if applicable): "14:10 today. Shorter fast in Sustain."

Bottom: "This is based on your cycle data. It gets more personal with every check-in."

4. WEEK AHEAD (if she taps)
7-day view with estimated phases, energy levels, brain modes.
Not empty. Not "wait 30 days." Useful estimates from Day 1.

5. END OF DAY 1
Push notification from Dot at 8pm: "How was today? Quick 30-second check-in helps me learn your patterns."
Simple mood/energy/sleep check-in (5 taps max).

6. DAY 2 MORNING
Push from Dot at 7am: "Good morning. Yesterday's check-in helped. Today's brief is a little smarter. Open up."
Slightly more personalized brief.

THE LOOP: brief > live her day > check in > better brief tomorrow. That's the retention engine.

---

## PRIORITY MATRIX

P0 (Ship This Week):
- Account deactivation + deletion (legal requirement)
- Generate estimates from period date + cycle length
- Show current phase on every screen
- Daily do's/don'ts based on phase
- Week Ahead with real estimates (kill empty state)

P1 (Next 2-4 Weeks):
- Fix Google Calendar OAuth (2 weeks)
- Dot's voice in all recommendations (2 weeks)
- Apple Health integration (3 weeks)
- Diet/fasting/training input in onboarding (4 weeks)
- Manual to-do sorting, no integration needed (4 weeks)
- Fix Whoop integration (4 weeks)
- Free vs. Premium tier structure + paywall (4 weeks)

P2 (Weeks 4-10):
- Oura Ring integration (6 weeks)
- Apple Calendar integration (4 weeks)
- Asana / Todoist / Reminders integration (8-10 weeks)
- Full Dot personality across all screens (6 weeks)

P3 (Weeks 8-12):
- Outlook Calendar (8 weeks)
- Peloton / Fitness+ / MyFitnessPal (12 weeks)

---

## THE BOTTOM LINE

The P0 items are not complex features. They're basic math (period date + cycle length = current phase) plus a content library (phase-based recommendations). The content already exists. We built the entire Daily Brief product spec with all 4 phases, all recommendations, all Dot quotes. The dev team just needs to surface it in the app.

Once P0 ships, a user opens PeakHer and immediately knows: what phase she's in, what to eat, how to move, what to schedule, and what Dot thinks about her day. That's PeakHer. That's the product. Everything else is enhancement.

---

## REFERENCE FILES

All files are in the PeakHer folder on Amanda's Desktop:
- PeakHer_Daily_Brief_Product_Spec.md — Full Daily Brief spec with all 4 phases, all sections, all Dot quotes
- PeakHer_Dot_Guidelines.html — Dot's personality, voice rules, phase language system
- PeakHer_Brand_Strategy_v2.html — Positioning, messaging, category language
- PeakHer_Email_Brief_v5_Sustain.html — Email version of the Daily Brief (reference for content)
- PeakHer_Daily_Brief_v2.html — App mockup with all 4 phases (reference for UI)
- PeakHer_Website_v3.html — Website with all copy and phone mockups (reference for feature descriptions)

## BRAND RULES FOR DEV TEAM

- Phase names: Restore, Rise, Peak, Sustain. NEVER menstrual, follicular, ovulatory, luteal in the UI.
- Dot is called "your Hormonal Intelligence assistant." NEVER "AI." NEVER "chatbot."
- Dot's voice: direct, informed, cheeky, warm, systematic. Lead with action, be specific, validate then redirect, never dump data without a decision.
- Social handle: @getpeakher
- Brand colors: Deep Plum #2D0A31, Hot Pink #FF2D7B, Electric Purple #9B30FF, Mint #00E5A0, Coral #FF6B6B, Gold #FFD700, Cream #FAF9F6
- Bottom tab bar: Check-in, History, Patterns, Week Ahead
