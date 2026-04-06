# PeakHer.ai - Project Context

## What This Is
PeakHer is the first **Hormonal Intelligence** platform. Not a period tracker. Not a wellness app. A decision engine that turns biological data into daily actions across work, movement, nutrition, and life.

**Live at:** https://peakher.ai
**Deployed on:** Vercel (auto-deploys from `main` branch)
**Repo:** https://github.com/HPVentures-auditor/PeakHer.git
**Category:** Hormonal Intelligence (proprietary category — we named it, we own it)

## Team & Roles
- **Jairek Robbins** — CPO/CTO. Product, tech, build, integrations.
- **Amanda Robbins** — CCO. Brand, voice, UX feel, community, content, target user definition. Amanda IS the target user. Her instincts are ground truth.
- **Partnership Status:** 90-day trial. Check-in: July 1, 2026. Long-term depends on collaboration experience, not product success.

## Tech Stack
- **Frontend:** Vanilla JS SPA (`/public/app/`)
- **Backend:** Vercel serverless functions (`/api/`)
- **Database:** Neon PostgreSQL (serverless, US-East-1)
- **AI:** Claude Haiku (`claude-haiku-4-5-20251001`) for daily briefings + insights
- **Billing:** Stripe (live keys, subscriptions, founding member pricing)
- **CRM:** GoHighLevel (contact management, email campaigns)
- **SMS:** Twilio (daily briefings + conversational check-ins). Env vars set on Vercel. Webhook pending SMS provider approval.
- **Native App:** Expo React Native at `/Desktop/Development/peakher-app/`

## Brand System (Updated April 2, 2026)

### Brand Positioning
- **Category:** Hormonal Intelligence
- **Tagline:** "Your biology is the strategy."
- **Mission:** PeakHer builds Hormonal Intelligence. We turn the data your body generates every month into the decisions that make you unstoppable.
- **What we are NOT:** A period tracker. A wellness app. A cycle syncing tool. Self-help.
- **What we ARE:** A decision engine. A system. Intelligence, not information.

### Dot — The AI Companion
Dot is PeakHer's Hormonal Intelligence AI. She is the voice of every recommendation, every score, every daily brief. Not a mascot — the product's interface with the user.

**Personality:** Direct, informed, cheeky, warm, systematic. "The slightly unhinged friend who built an algorithm around your cycle and sends you a brief every morning so you don't have to think."

**Dot's Rules:**
1. Always lead with the action (never lead with data)
2. Be specific, not general (times, foods, specific actions)
3. Validate feelings as biological, then redirect with an action
4. One voice, phase-adjusted tone (not multiple personas)
5. Never dump data without a decision
6. Use "I" and "your" — never "we" or "users"

**Litmus Test:** Would someone say "Dot told me to ___" out loud? Does this lead with what to DO? Is there a decision? Could this appear in a period tracker? (If yes, rewrite.) Would Siri say this? (If yes, add personality.)

**Full Dot Guidelines:** See `PeakHer_Dot_Guidelines.html` in Dropbox shared folder.

### Two Brand Registers
- **Consumer Register:** Dot's voice. Cheeky, direct, relatable. Used in: Daily Brief, app, push notifications, social, email, onboarding.
- **Technology Register:** Confident, precise, data-rich. Used in: Investor decks, press, partnership proposals, patents.

### Phase Names & Colors (UPDATED — replacing old names)
| Phase | Days | Old Name | New Name | Color | Hex |
|-------|------|----------|----------|-------|-----|
| Menstrual | 1-5 | Reflect | **Restore** | Purple | `#9B30FF` |
| Follicular | 6-14 | Build | **Rise** | Green | `#00E5A0` |
| Ovulatory | 15-17 | Perform | **Peak** | Gold | `#FFD700` |
| Luteal | 18-28 | Complete | **Sustain** | Coral-Red | `#FF6B6B` |

**Rule:** Consumer-facing copy uses Restore/Rise/Peak/Sustain ONLY. Clinical terms (luteal, follicular, etc.) are for the technology register. Education layer uses PeakHer name first, clinical as secondary context: "Sustain is what science calls the luteal phase."

### UI Colors (existing, may evolve)
- Navy: `#0a1628`
- Coral: `#E87461`
- Teal: `#2d8a8a`
- Cream: `#faf8f5`
- Font: Inter (Google Fonts)

### 5 User Archetypes (Updated April 2, 2026)
1. **The Business Woman** — sales, entrepreneurship, leadership (consolidated from 3). Sub-selection for personalization.
2. **The Athlete** — periodized training, PR prediction
3. **The Mom** — patience reserves, emotional capacity
4. **The Caregiver** — nurses, doctors, therapists, first responders (NEW, Amanda's add)
5. **The Creative** — flow states, ideation windows

### 3 Marketing Personas
1. **"Optimized Olivia"** (28-36, $75K-$150K, knowledge worker) — 55% of marketing. Hook: product demo screenshots. Channel: Instagram, email, Oura community.
2. **"Explorer Emma"** (22-27, $45K-$75K, cycle-curious) — 30% of marketing. Hook: "you're not lazy, you're in Sustain." Channel: TikTok, Reels, influencers.
3. **"Performer Patricia"** (32-42, $120K-$250K+, senior professional) — 15% of marketing. Hook: Calendar Intelligence. Channel: LinkedIn, podcasts.

### Content Pillars
- 40% — **The Problem Has a Name** (reframes frustrations as hormonal, not personal)
- 30% — **The Brief in Action** (product demos disguised as content — "Here's what Dot told me today")
- 20% — **Hormonal Intelligence** (category-building education)
- 10% — **Community Proof** (UGC, testimonials, user stories)

### Words We Retired
- "Weaponize your cycle" (implies body is a problem)
- "Hack" (biohacker bro energy)
- "Period" as primary frame (shrinks us to period tracker)
- "Hormonal blueprint" (static; "intelligence" is dynamic)

## Current Scoreboard (April 2, 2026)
- **Users:** 5 total (3 real: Amanda, Katika, Mina + Jairek + test account)
- **Check-ins:** 12 total
- **Top streak:** Jairek — 4 days
- **SMS:** Not yet live (awaiting provider approval)
- **Revenue:** $0 (pre-launch, pre-revenue)
- **Stage:** BUILD MODE

## What's Built (Shipped Features)

### Core App
- **Onboarding:** 6-step flow, Day 1 education, exact vs estimated date modes, voice persona selector
- **Daily AI Briefings:** 800+ lines phase-specific knowledge (nutrition, fasting, fitness, productivity, emotional weather). Luteal emotional toolkit (days 24-28). Voice personas. Day-1 rich briefings.
- **Daily Check-ins:** Energy + confidence sliders, optional sleep/stress/notes. Streak tracking.
- **Pattern Dashboard:** Unlocks at 14 check-ins. Pearson correlation, day-of-week analysis, phase averages.
- **AI Insights:** Unlocks at 25 check-ins. Full AI pattern analysis, cached in DB.
- **Week Ahead Forecast:** 7-day prediction with best-day highlight.
- **Events:** Quick-log wins, challenges, flow states with category tags.
- **Settings:** Voice changer, SMS prefs, phone verification, data export, account deletion.

### Infrastructure
- **SMS (Twilio):** Conversational check-ins, morning briefings, OTP verification, state machine. Webhook pending.
- **Google Calendar:** OAuth flow built, incremental sync, event classification + importance scoring. Needs wiring to briefings.
- **Wearable Schema:** Oura, Whoop, Garmin tables + sync logic built. Needs API connections.
- **Billing (Stripe):** Checkout, portal, webhooks, 14-day trial, founding member pricing.
- **Admin Dashboard:** User stats, segments, activity tracking, user management.
- **Waitlist + Beta Automation:** Quiz lead magnet, GHL integration, auto-invite system.
- **Push Notifications:** Web Push via VAPID.
- **Native iOS App:** Expo React Native, 14 screens, compiles. Apple Developer enrolled (Team ID: 6LD6UBS889). Pending App Store submission.

## What's In Progress / Next

### This Week (April 2-7, 2026)
1. **Amanda's walkthrough DONE.** Follow-up questions sent. Awaiting her ranked top 3 priorities.
2. **Google Calendar integration** — wire synced events into Daily Brief AI context
3. **Health wearable integrations** — Oura, Whoop, Garmin API connections
4. **Implement Amanda's UX/brand feedback** (after she submits priorities)

### Pending Product Changes (From Brand Alignment April 2)
- [ ] Rename phases: Reflect→Restore, Build→Rise, Perform→Peak, Complete→Sustain
- [ ] Update phase colors: #7BA7C2→#9B30FF, #5EC49A→#00E5A0, #E87461→#FFD700, #C49A5E→#FF6B6B
- [ ] Decide: consolidate 4 voice personas → single Dot voice with phase-adjusted tone
- [ ] Build Readiness Score (most referenced feature in brand strategy)
- [ ] Build Calendar Intelligence (surface in briefings)
- [ ] Build Task Sorting (completes "decision engine" positioning)
- [ ] Rebuild onboarding in Dot's conversational voice
- [ ] Dot sign-offs on every briefing (phase-specific, from Dot Guidelines)
- [ ] SMS provider approval → configure Twilio webhook
- [ ] Apple App Store submission retry

### Future
- Partner Mode ("she's in Sustain, bring snacks")
- ML pattern engine (replace statistical when data justifies)
- Community (Discord at 1,000+ users)
- Social media launch (12-week plan written, held until product is solid)
- Patent filings (6 areas identified in brand strategy: calendar optimization, task prioritization, IF adjustment, nutrition, meeting coaching, readiness scoring)

## Amanda's Brand Documents (in Dropbox shared folder)
All in `~/Dropbox/PeakHer - Assets : Ideas/`:
- `PeakHer_Brand_Strategy_v2.html` — Full brand playbook (category, positioning, voice, content strategy, acquisition thesis)
- `PeakHer_Demographic_Psychographic_Profile.md` — Market research, personas, competitive landscape, 40+ sources
- `PeakHer_Dot_Guidelines.html` — Dot's personality, voice rules, copy examples for every surface, visual identity, litmus test
- `PeakHer_Daily_Brief.html` — Daily Brief email format/example
- `PeakHer_Mascot.html` — Visual mascot concepts
- `PeakHer_Walkthrough_Amanda.html` — Product walkthrough presentation (built April 2)
- `PeakHer_Amanda_FollowUp.html` — 15 follow-up alignment questions (built April 2)
- `PeakHer_App_Mockups.html` — App mockup concepts

## Weekly Meeting Cadence
- **When:** Weekly (started April 1, 2026)
- **Format:** Express meeting (~23 min): Pulse check → Scoreboard → Top 3 priorities → One big decision → Commitments
- **Notes:** `/partnership/WEEKLY_MEETING_NOTES.md`
- **Roles doc:** `/partnership/ROLES_AND_OWNERSHIP.md`

## Key File Locations
```
/public/app/js/onboarding.js    # 6-step onboarding flow
/public/app/js/briefing.js      # Briefing frontend renderer
/public/app/js/settings.js      # Settings slide-over panel + SMS
/public/app/js/api.js           # Frontend API service layer
/public/app/index.html           # Main app HTML + CSS
/api/briefing.js                 # AI briefing engine (800+ lines phase knowledge)
/api/auth/register.js            # Registration with voice + confidence
/api/auth/login.js               # Login returning full profile
/api/user.js                     # Profile GET/PUT
/api/sms/webhook.js              # Twilio incoming SMS handler
/api/sms/send-briefing.js        # SMS briefing sender
/api/cron/sms-briefings.js       # Hourly SMS cron
/api/calendar/                   # Google Calendar OAuth + sync
/api/wearable/                   # Wearable integrations (Oura, Whoop, Garmin)
/api/_lib/patterns.js            # Statistical correlation engine
/api/_lib/claude.js              # Claude API wrapper
/api/_lib/twilio.js              # Twilio SDK wrapper
/scripts/migrate_*.js            # Database migrations
/vercel.json                     # Vercel config + cron jobs
/partnership/                    # Roles, meeting notes, operating system
```

## Accounts & Credentials
- **Expo:** peakher1984 (expo.dev)
- **Apple Developer:** Jairek Robbins, Team ID 6LD6UBS889, jairekr@me.com
- **Twilio:** Credentials in Vercel env vars (shared with EOAI — consider dedicated number)
- **Vercel:** jairek-robbins-projects/peakher
- **Neon DB:** ep-bitter-feather-a41jgrsp (US-East-1)
- **Domain:** peakher.ai
- **Stripe:** Live keys in Vercel env vars
