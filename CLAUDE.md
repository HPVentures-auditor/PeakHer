# PeakHer.ai - Project Context

## What This Is
Women's personal performance platform that tracks biological rhythm and correlates with real-world performance across business, fitness, family, leadership. Discovers each woman's unique "Performance Fingerprint."

**Live at:** https://peakher.ai
**Deployed on:** Vercel (auto-deploys from `main` branch)
**Repo:** https://github.com/HPVentures-auditor/PeakHer.git

## Tech Stack
- **Frontend:** Vanilla JS SPA (`/public/app/`)
- **Backend:** Vercel serverless functions (`/api/`)
- **Database:** Neon PostgreSQL (serverless, US-East-1)
- **AI:** Claude Haiku (`claude-haiku-4-5-20251001`) for daily briefings + insights
- **Billing:** Stripe (live keys, subscriptions, founding member pricing)
- **CRM:** GoHighLevel (contact management, email campaigns)
- **SMS:** Twilio (daily briefings + conversational check-ins). NEW, env vars set on Vercel
- **Native App:** Expo React Native at `/Desktop/Development/peakher-app/`

## Brand Design System
- Dark navy: `#0a1628`
- Coral: `#E87461`
- Teal: `#2d8a8a`
- Mode colors: Reflect=`#7BA7C2`, Build=`#5EC49A`, Perform=`#E87461`, Complete=`#C49A5E`
- Font: Inter (Google Fonts)

## The 4 Modes Framework
- **Reflect** (Days 1-5), Menstrual: Rest, review, intuition peaks
- **Build** (Days 6-14), Follicular: Energy rising, creativity, start new things
- **Perform** (Days 15-17), Ovulatory: Peak confidence, pitch, present, negotiate
- **Complete** (Days 18-28), Luteal: Detail work, finish projects, don't start new

## What Was Built on 2026-03-27

### 1. Onboarding Overhaul (`/public/app/js/onboarding.js`)
- Now 6 steps (was 5)
- **Day 1 Education Panel:** "Day 1 = full flow, NOT spotting" with visual explanation
- **Two input modes:** "I know my exact date" (date picker) vs "Help me estimate" (guided questions)
- **Confidence disclaimer:** Different messaging for exact vs estimated dates
- **Voice Persona Selector (NEW step):** 4 coach voices with preview text:
  - Sassy Bestie 💅
  - Science-Backed & Precise 🔬
  - Spiritually Centered 🌙
  - Hyped Motivator 🔥

### 2. Enriched AI Briefings (`/api/briefing.js`)
- 800+ lines of new phase-specific knowledge embedded in AI system prompt
- **6 structured sections per briefing:** Phase Overview, Nutrition, Movement, Focus, Emotional Weather, Key Insight
- **Covers per phase:** What to eat, fasting windows, workout types/intensity, task prioritization, schedule optimization, emotional expectations, fertility awareness
- **Luteal Emotional Toolkit (days 24-28):** Proactive validation, "DO NOT send that email" guardrails, emergency actions (magnesium, walks, baths), reframe techniques
- **4 voice personas** change entire briefing tone via AI system prompt
- **Day-1 rich briefings:** Full actionable content from just cycle data, no check-in history required
- **cycle_date_confidence:** Adjusts language ("You're likely in Build" vs "You're in Build")
- Static fallback if Claude API is down
- Frontend renderer (`/public/app/js/briefing.js`) with collapsible accordion sections

### 3. Twilio SMS Integration
**New files:**
- `/api/_lib/twilio.js`: Twilio SDK wrapper
- `/api/sms/webhook.js`: Incoming SMS handler (conversational check-ins)
- `/api/sms/send-briefing.js`: Send condensed daily briefing via SMS
- `/api/sms/subscribe.js`: Phone add/verify/remove
- `/api/sms/verify.js`: OTP verification
- `/api/cron/sms-briefings.js`: Hourly cron, timezone-aware sends
- `/public/app/js/settings.js`: Settings panel with SMS preferences

**SMS conversation flow:**
- Morning: AI briefing arrives as text
- User replies with number (1-10) → energy rating
- Bot asks for confidence → user replies
- Logs check-in, sends acknowledgment with streak count
- Supports: "STOP", "help", free text notes

**Twilio env vars set on Vercel:**
- `TWILIO_ACCOUNT_SID` (set in Vercel)
- `TWILIO_AUTH_TOKEN` (set in Vercel)
- `TWILIO_PHONE_NUMBER` (set in Vercel)

**Cron added to vercel.json:** `0 * * * *` (hourly) → `/api/cron/sms-briefings`

### 4. Settings Panel (`/public/app/js/settings.js`)
- Gear icon in top nav
- Phone number entry + OTP verification
- SMS enable/disable toggle
- Briefing time selector (6 AM - 12 PM)
- Timezone selector (auto-detected)
- Coach voice changer
- Data export + account deletion

### 5. Expo Native App (`/Desktop/Development/peakher-app/`)
- **14 screens:** Auth (login, signup, forgot password), Onboarding (4 steps), 5 tab screens (Today, Check-In, Patterns, Calendar, Settings)
- **Tech:** Expo SDK 55, TypeScript, Expo Router, Zustand, SecureStore
- **API service** hitting real `peakher.ai` backend with JWT auth
- **Compiles successfully.** iOS bundle exports at 2.8MB
- **Expo account:** `peakher1984` on expo.dev
- **EAS project ID:** `35a35aee-be18-42a0-9b26-772c2801bec9`
- **Apple Developer:** Team ID `6LD6UBS889`, enrolled 2026-03-27 (Individual, jairekr@me.com)
- **Bundle ID:** `ai.peakher.app`

### 6. Database Migrations (all executed 2026-03-27)
- `scripts/migrate_onboarding_v2.js`: Added `cycle_date_confidence` to cycle_profiles, `coach_voice` to users
- `scripts/migrate_briefing_v2.js`: Added `coach_voice` + `cycle_date_confidence` to cycle_profiles
- `scripts/migrate_sms.js`: Added phone/SMS fields to users, created sms_verification_codes, sms_conversation_state, sms_log tables

### 7. API Changes
- `/api/auth/register.js`: Accepts/stores coachVoice + cycleDateConfidence
- `/api/auth/login.js`: Returns coachVoice + cycleDateConfidence
- `/api/user.js`: GET/PUT support for coachVoice + cycleDateConfidence + SMS fields
- `/api/briefing.js`: Complete rewrite with phase knowledge base + voice personas

### 8. HTML Overview Page
- `/Desktop/PeakHer_Overview_For_Amanda.html`: Single-page explainer for Amanda showing how PeakHer works, demo walkthrough, current status, business model, roadmap

## What's NOT Done Yet: Next Steps

### Immediate (Tomorrow)
1. **Apple App Store Build.** Apple Developer account just enrolled (2026-03-27 evening). Auth was failing due to propagation delay. Retry in morning:
   ```
   cd ~/Desktop/Development/peakher-app && eas build --platform ios --profile production
   ```
   Then submit to TestFlight: `eas submit --platform ios`

2. **Twilio Webhook Configuration.** Need to set in Twilio console:
   - Go to console.twilio.com → Phone Numbers → +16316584171
   - Set "A message comes in" webhook to: `https://peakher.ai/api/sms/webhook` (POST)
   - **WARNING:** This number is shared with ExecutiveOfficeAi. Consider buying a dedicated PeakHer number ($1.15/mo)

3. **Test the full web flow.** Amanda signs up fresh at peakher.ai, goes through new 6-step onboarding, gets Day-1 briefing, tests voice personas

### Near-Term
4. **Google Calendar API integration.** Cross-reference schedule with cycle phase for briefings ("You have a board call Thursday; that's your Perform window")
5. **A/B test phase names.** Current: Reflect/Build/Perform/Complete vs Identity: Hermit/Creator/Queen/Strategist. Keep both, test which resonates
6. **Buy dedicated Twilio number** for PeakHer
7. **Partner Mode.** Parked for future. Men's-facing layer ("she's in luteal, bring snacks")

### Future
8. **Integrations:** Apple Health, Garmin, Whoop, Oura, Google Calendar
9. **ML pattern engine.** Replace statistical analysis when data volume justifies
10. **Social media launch.** 12-week content plan written (see Amanda's playbook). Fix product first, then pour gas on distribution
11. **Community features.** Discord at 1,000+ users

## Amanda's Key Feedback (2026-03-27)
- **#1 Problem:** App asks for data but gives NONE back immediately → FIXED (Day-1 briefings)
- **SMS is the killer channel:** texting a coach/bestie, not opening a website → BUILT
- **Specific actionable content:** what to eat, fasting duration, workout type per phase → BUILT
- **Voice personas:** let her choose how the AI talks to her → BUILT
- **Calendar integration:** "based on your calendar, here's how to organize your day/week" → NEXT
- **Brand voice:** Manscaped/Poo-Pourri energy (funny, relatable, sticky) → Partially done in AI prompts
- **App Store app:** "Claude Code can do it cheaper and faster" → IN PROGRESS
- **Partner mode:** not yet, keep on list
- **A/B test phase names:** technical + identity labels both

## Key File Locations
```
/public/app/js/onboarding.js    # 6-step onboarding flow
/public/app/js/briefing.js      # Briefing frontend renderer (v1 + v2)
/public/app/js/settings.js      # Settings slide-over panel + SMS
/public/app/js/api.js           # Frontend API service layer
/public/app/index.html           # Main app HTML + CSS
/api/briefing.js                 # AI briefing engine (800+ lines phase knowledge)
/api/auth/register.js            # Registration with voice + confidence
/api/auth/login.js               # Login returning full profile
/api/user.js                     # Profile GET/PUT
/api/sms/webhook.js              # Twilio incoming SMS handler
/api/sms/send-briefing.js        # SMS briefing sender
/api/sms/subscribe.js            # Phone management
/api/sms/verify.js               # OTP verification
/api/cron/sms-briefings.js       # Hourly SMS cron
/api/_lib/twilio.js              # Twilio SDK wrapper
/scripts/migrate_*.js            # Database migrations
/vercel.json                     # Vercel config + cron jobs
```

## Accounts & Credentials
- **Expo:** peakher1984 (expo.dev)
- **Apple Developer:** Jairek Robbins, Team ID 6LD6UBS889, jairekr@me.com
- **Twilio:** Credentials in Vercel env vars (shared with EOAI)
- **Vercel:** jairek-robbins-projects/peakher
- **Neon DB:** ep-bitter-feather-a41jgrsp (US-East-1)
- **Domain:** peakher.ai
