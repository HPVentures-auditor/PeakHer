# PeakHer UX/UI Best Practices Reference
## Compiled April 11, 2026 — For App Redesign

---

## BOOKS TO REFERENCE

### Must-Read (Most Relevant to PeakHer)
1. **"Refactoring UI" by Adam Wathan & Steve Schoger** — Practical, visual-first guide to making interfaces look polished. Covers spacing, color, typography, dark mode aesthetics. Best single resource for "premium look and feel."
2. **"Hooked" by Nir Eyal** — Engagement loop framework (Trigger, Action, Variable Reward, Investment). Directly applicable to Dot's morning notifications, streaks, and daily check-ins.
3. **"Designing for Behavior Change" by Stephen Wendel** — Behavioral science applied to product design. Habit formation, motivation mapping, science behind streaks and nudges.
4. **"Engaged" by Amy Bucher** — Specifically for health and wellness product design. Self-determination theory applied to health apps.
5. **"Don't Make Me Think" by Steve Krug** — The classic on intuitive interfaces and reducing cognitive load.
6. **"Information Dashboard Design" by Stephen Few** — Authority on data visualization for scores and health metrics.

### Already On Disk
- `Desktop/Books & Training/Books You still need EOAI/Designing_brand_identity_-_Alina_wheeler.pdf`
- `Desktop/Books & Training/Books You still need EOAI/The_Non-Designers_Design_Book_-_Robin_Williams.pdf`

---

## KEY FRAMEWORKS

### Self-Determination Theory (SDT)
Why Oura's Readiness Score works. Three drivers:
- **Autonomy** — user chooses what to act on (Whoop's strain coaching)
- **Competence** — score gives feedback on progress (Oura's readiness)
- **Relatedness** — feeling understood (Dot's personalized voice)

### Apple Human Interface Guidelines (Health Apps)
- Progressive permissions: ask for HealthKit/notifications only when contextually relevant, never all at once
- Explain exactly WHY you need each data point before requesting it
- Charts framework for native-feeling data visualization
- Support Dynamic Type for accessibility

### Material Design 3
- Dynamic color system (tonal palettes from seed color) — maps to PeakHer's phase-adaptive colors
- Elevation through tonal surface colors, not just shadows
- "Large display" components for health data (big numbers with supporting context)

---

## BEST PRACTICES — APPLIED TO PEAKHER

### The "One Big Thing" Pattern (Oura's Core Insight)
- Users open the app to see ONE number. Everything else is secondary.
- For PeakHer: **Phase Circle + Readiness Score** is the hero.
- All other data (nutrition, movement, fasting) serves that primary view.
- Reduces decision fatigue, creates daily ritual: open, check phase, close or explore.

### Data Visualization
- Lead with ONE primary score (ring or arc). PeakHer Readiness Score = our version.
- Use rings/arcs for progress (Apple Activity Rings proved this works).
- Color-code ranges: green (optimal), yellow (caution), red (attention).
- Time-series charts: default to 7 days, swipe for 30/90.
- Always show trend direction, not just current value.

### Card-Based Information Architecture
- Each card = one insight, one action. Never mix multiple metrics.
- Visual hierarchy: icon/label at top, big number center, context/trend bottom.
- Tappable cards expand into detail (progressive disclosure).
- Prioritize card order by time of day (morning: readiness/sleep; evening: activity).

### Onboarding That Converts
- 3-5 screens maximum before showing value.
- Collect personalization data AS the onboarding (cycle length, goals, archetype).
- User should feel they're building something custom, not filling out forms.
- Show preview of "your personalized dashboard" before account creation.
- Progressive permissions: ask for notifications/health data only in context.

### Daily Engagement Hooks
- Morning notification: one sentence, personalized. From Dot. Open loop.
- Streaks with grace days (Duolingo's freeze mechanic). Punishing streaks cause churn.
- Weekly insight emails that surface something user didn't notice in-app.
- Micro-celebrations for milestones (haptic feedback, subtle animation, not confetti overload).

### Progressive Disclosure
- Layer 1: Score + one-line insight (home screen)
- Layer 2: Tap for detail (expanded card)
- Layer 3: Tap again for science/explanation ("learn more" for science-curious)
- Never show raw data on home screen. Always interpret it first.

### Dark Mode Design
- Background: #121214 (not pure black, not #000000)
- Elevation = lighter surface tones (#1A1A26, #222237), not shadows
- Accent colors at 60-70% saturation (fully saturated vibrates against dark)
- White text opacity: 87% primary, 60% secondary, 38% disabled
- Test all color-coded elements in both modes (health reds/greens often fail)
- Subtle shadows only in light mode

### Accessibility
- Minimum 4.5:1 contrast ratio (WCAG AA)
- Never rely on color alone — add icons or text labels
- Support Dynamic Type (iOS) / scalable text
- VoiceOver support for all charts (text alternatives for visual data)

### Spacing & Surfaces (from Amanda's Design System)
- 4px base unit
- Cards: 14-16px padding, 16px border radius
- Grid gap: 10px
- Screen padding: 16px
- Generous whitespace = premium + breathable feel

---

## INSPIRATION APPS (Study These)

| App | What to Learn |
|-----|---------------|
| **Oura** | Readiness Score pattern, dark mode, minimal UI, progressive disclosure, data viz |
| **Whoop** | Strain/recovery model, dark premium aesthetic, journal-based correlations, score rings |
| **Flo** | Cycle visualization, content integration, hormonal health data display |
| **Calm** | Onboarding personalization, serene visual design, gentle animations, anxiety reduction through UI |
| **Apple Health** | Summary screen design, trend detection, multi-source data |
| **Eight Sleep** | Dark luxury aesthetic, single temperature score |

---

## COURSES (If Needed)
- **Google UX Design Professional Certificate** (Coursera) — full UX process foundation
- **Interaction Design Foundation** — "Mobile UX Design" and "Data Visualization" courses
- **Designcode.io** — designing AND building for iOS/React Native
- **NNGroup (Nielsen Norman Group)** — "Mobile UX" and "Dashboard Design" (gold standard, premium)

---

## NORTH STAR DESIGN RULE (Amanda's)

> "Design every screen asking 'would she screenshot this?' If the answer is no, the screen isn't done."

---

*Reference document for PeakHer app redesign. Updated April 11, 2026.*
