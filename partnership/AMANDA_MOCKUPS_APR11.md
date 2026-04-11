# PeakHer App Redesign — Amanda's Mockups
## April 11, 2026

Source files in Dropbox: `PeakHer - Assets : Ideas/Screenshot 2026-04-11 at 2.05-2.06*.png`

---

## INSTRUCTIONS FROM JAIREK
- Keep current bottom menu: **Checkin, History, Patterns, Week Ahead**
- Update language to phase names: **Restore, Rise, Peak, Sustain** (not Menstrual/Follicular/Ovulatory/Luteal in consumer-facing UI)
- Add phase circle showing current phase + roughly how long remaining
- Apply best-in-class health/fitness app design patterns
- Reference all training materials for UX/UI best practices

---

## Design System (from Amanda's notes)

### Typography
- **Headings:** Plus Jakarta Sans (800 weight)
- **Body:** Inter
- Inspired by Oura's "quiet, reductive" approach
- Generous spacing, medium weights

### Navigation
- Mockups show 3-tab max: Today, Insights, Profile
- **OVERRIDE:** Keep current 4-tab: Checkin, History, Patterns, Week Ahead

### Color System
- Phase colors adapt the interface accent to current phase:
  - Restore (Menstrual): Rose
  - Rise (Follicular): Mint
  - Peak (Ovulatory): Gold
  - Sustain (Luteal): Lavender
- Interface adapts accent colors to current phase

### Dark-First
- Dark mode is default (following Whoop + Oura)
- Dark grays: #121214 (not pure black)
- Light mode: warm neutrals #F7F6F3 (not harsh white)
- Subtle shadows only in light mode

### Information Hierarchy
- "One big thing" pattern from Oura
- Cycle ring is the hero element
- Bento grid surfaces 4 key metrics
- Progressive disclosure: summary first, detail on tap

### Inspiration Sources
- **Oura:** progressive disclosure, quiet typography
- **Whoop:** score rings, dark surfaces
- **Flo:** cycle visualization
- **Calm:** warm, low-stimulus UI

### Surfaces & Cards
- 16px border radius on all cards
- Elevated dark surfaces: #1A1A26, #222237
- Depth without borders
- Subtle shadows only in light mode

### Spacing
- 4px base unit
- Cards: 14-16px padding
- Grid gap: 10px
- Screen padding: 16px
- Generous whitespace = premium + breathable

---

## Screen-by-Screen Breakdown

### 1. Welcome / Login (Dark Mode)
- Purple gradient background (dark to purple)
- PeakHer logo with clock icon at top
- Tagline: "Sync your life to your cycle. Workouts. Nutrition. Energy. All personalized."
- Primary CTA: "Get Started" (gradient button)
- Secondary: "I already have an account" (text link)

### 2. Home — "Today" (Hero Screen)
- Greeting: "Good morning, Amanda"
- **Phase Circle (Hero Element):**
  - Large multi-colored ring showing all 4 phases
  - Center: "18 DAY OF CYCLE"
  - Below center: phase label (e.g., "Sustain Phase")
  - Ring segments colored by phase, current phase highlighted
  - Shows roughly where user is in their cycle
- **Bento Grid (4 cards below circle):**
  - Energy/Readiness Score (e.g., 72) with colored ring
  - Today's Move (e.g., Pilates, 35 min, Low Impact)
  - Nutrition focus (e.g., "Warm: Complex carbs + magnesium")
  - Rest/Recovery (e.g., "Prioritize sleep tonight")
- **Phase Insight Card:**
  - Labeled by phase (e.g., "SUSTAIN INSIGHT")
  - Dot-voice insight about what's happening hormonally
  - Example: "Your serotonin dips this week. Cravings for carbs and chocolate are your body asking for serotonin support."

### 3. Today's Movement (Detail Screen)
- Header: phase + day (e.g., "Sustain Phase, Day 18")
- Recommended intensity badge (Lower-Moderate)
- Phase-aware explanation of WHY this intensity
- Workout cards with: name, duration, impact level, tags (Phase-Matched, Recovery, Cortisol Reset)
- Example workouts: Slow Flow Pilates, Evening Walk, Gentle Yoga

### 4. Nutrition (Detail Screen)
- Header: phase + day
- "Today's Focus" nutrient pills (Carbs, Mg, B6) with one-line reasons
- Recommended Foods list with explanations
- Each food tied to a hormonal benefit

### 5. Phase Detail (Drill-down)
- Current phase name, day range, days remaining
- Phase characteristic tags (Lower energy, Cravings, Introspective, Nesting mode)
- Hormone level visualization (Estrogen + Progesterone curves)
- "What to Expect" bullet list

### 6. Insights (Analytics)
- Calendar heat map colored by phase
- Phase legend
- PATTERNS section with trend cards
- Cycle length consistency analysis
- Discovery insights (e.g., "Luteal sleep disruption pattern")

### 7. Profile
- Avatar + name
- Cycle day + phase
- Stats row: Cycles Tracked, Avg Length, Avg Energy
- Settings list: Cycle Settings, Notifications, Appearance, Privacy & Data, Health Integrations, Help & Support

---

*Captured from Amanda's mockup screenshots, April 11, 2026*
