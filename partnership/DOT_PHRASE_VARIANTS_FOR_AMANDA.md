# Dot Phrase Variants — For Amanda's Approval

**Why:** Today, every Rise day for ~9 days/cycle, the Daily Brief opens with the *exact same line*. Same for Restore/Peak/Sustain. Greeting and sign-off are hardcoded one-per-phase strings in `api/briefing.js:631-643`. That's where the "same thing over and over" feeling comes from — not Claude.

**Fix:** Replace each one-line entry with a bank of 8 variants. Pick by `cycleDay % 8` so the rotation is deterministic per day (different opener Rise day 1 vs Rise day 2 vs Rise day 3, but same opener if she lands on Rise day 1 next cycle). Different offset for sign-offs so opener/closer don't always pair the same way.

**What I need from you, Amanda:**
1. Cross out any that don't sound like Dot.
2. Edit any that are 80% there.
3. Write your own to replace any I missed.
4. We need at least 6 keepers per phase to ship. 8 is better. Anchors are already production-tested — keep those unless you want them gone.

**Voice rules I followed:** No em dashes. No "we" or "users". Phase names only (Restore/Rise/Peak/Sustain), never clinical (luteal/follicular/etc.). Action first, science second. Hormones named when they earn their keep. Cheeky, not corporate.

`{name}` = user's first name, injected by code.

---

## RESTORE (Days 1-5) — gentle, validating, protective

### Greetings

1. **[ANCHOR — currently shipping]** "{name}, gentle morning. Your body did a lot this month. Let's keep it low today."
2. "{name}, your body is in cleanup mode. Your job today is hydration, warmth, and lower expectations."
3. "{name}, slow start. This is not laziness. This is biology rebuilding the lining. Honor it."
4. "Hey {name}. Estrogen and progesterone are at their floor. That's why everything feels heavier. Today is about less, not more."
5. "{name}, day one of a brand new cycle. Treat yourself the way you'd treat a friend who just ran a marathon."
6. "{name}, you're in Restore. Translation: you have permission to do the bare minimum and still call it a productive day."
7. "Listen {name}. Your hormones are at low tide. Don't fight the current today, just float."
8. "{name}, this is the quiet floor of your cycle. Rest now. Rise is coming. I promise."

### Sign-offs

1. **[ANCHOR]** "The to-do list can wait. Today is about the basics: warmth, nourishment, rest. Your body just completed a full cycle. Be gentle. I'll have a fresh plan when you're ready."
2. "Soup, sweatpants, soft lights. The strategy today isn't ambition, it's recovery. I'll be here when your energy is."
3. "If you do nothing else today, drink water, eat warm food, go to bed early. That's the win. I'll handle ambition tomorrow."
4. "Rest now. Rise is coming. Cancel one thing. Reschedule another. You don't have to earn this."
5. "Your job today is to not have a job. I'll send the next plan when your body is ready for it."
6. "Take the long shower. Skip the workout. Eat something with iron in it. I'll see you tomorrow."
7. "Restore isn't a vacation, it's maintenance. Your body is doing real work even when you're horizontal. Trust it."
8. "Slow is the assignment. I'll bring the strategy back when you bring the energy back."

---

## RISE (Days 6-14) — energized, encouraging, creative

### Greetings

1. **[ANCHOR]** "{name}, today's going to be one of those days. The good kind."
2. "{name}, estrogen is climbing and your brain wants something new to chew on. Pick the thing you've been avoiding and start messy."
3. "Morning {name}. You're in Rise. This is your 'begin the project, send the bold email, sketch the dumb idea' window. Use it."
4. "{name}, your Rise brain is online and it is HUNGRY. Feed it a problem worth solving."
5. "{name}, today your body is biased toward novelty. Don't waste that on doomscrolling. Start the thing."
6. "Hey {name}. Estrogen rising means dopamine's friendlier. Risk feels lighter. Take the small bet today."
7. "{name}, you woke up with more bandwidth than you'll have for the next two weeks. Spend it on something future-you will thank you for."
8. "{name}, Rise mornings are for first drafts and weird ideas. Permission granted to be a little ambitious."

### Sign-offs

1. **[ANCHOR]** "Go be ambitious today. Your energy is climbing and your brain is wired for novelty. Start the thing. Say yes to the thing. I'll be here tomorrow with your next plan."
2. "Your dopamine is friendlier today than it'll be in three weeks. Spend it on the thing you've been postponing."
3. "Start messy. Ship ugly. Course-correct on Wednesday. Rise rewards momentum, not polish."
4. "Make a list of the bold things. Do one. We'll do another tomorrow." *(check: "we'll" — replace with "I'll" or "you'll" if Dot rule strict)*
5. "Today is for first drafts, first asks, first reps. None of it has to be perfect. It just has to start."
6. "If you've been waiting for the right moment to do the scary thing, your hormones just RSVP'd yes. Go."
7. "Rise mornings are stolen from your future self. Steal something good. I'll see you tomorrow."
8. "You will never feel more inclined to begin than you do this week. Begin."

---

## PEAK (Days 15-17) — hyped, confident, bold

### Greetings

1. **[ANCHOR]** "{name}, you're in your main character era. Literally. Biologically. Let's go."
2. "{name}, Peak week. Your verbal fluency just got an upgrade. Have the hard conversation today."
3. "Hey {name}. Estrogen and testosterone are co-spiking. This is the room-reading, deal-closing, magnetic version of you. Don't waste it on busywork."
4. "{name}, your communication superpower is online. Pitch the thing. Ask for the raise. Make the call you've been delaying."
5. "{name}, Peak. Your body literally evolved to be persuasive this week. Use that for good. Or for getting what you want. Same thing."
6. "{name}, today you're operating at the top of your range. Front-load the high-stakes stuff. Save the laundry for next week."
7. "Morning {name}. This is the 72-hour window where your brain runs hottest. Pick one big move and make it."
8. "{name}, you didn't suddenly get more confident. Your hormones did. Either way, ride it."

### Sign-offs

1. **[ANCHOR]** "You are genuinely, biologically peaking right now. Crush it. I'll tell you when to ease off. Not today."
2. "Three days. That's the window. Don't spend it on errands. Spend it on the conversations that change something."
3. "Your charisma is on a 72-hour subscription. Use it before the renewal."
4. "Pitch the pitch. Send the email. Take the meeting. This version of you is the one that closes things."
5. "Save the spreadsheet for Sustain. Today is for the human stuff: persuasion, presence, performance."
6. "Peak is a short window. Front-load the high-stakes calls. Tomorrow's you will thank you."
7. "If a brave version of you wanted to say something, today is the day she has the brain chemistry to say it well."
8. "Eat. Hydrate. Sleep. The hormones can carry the rest of you today."

---

## SUSTAIN (Days 18-28) — warm, grounded, practical, no-BS

### Greetings

1. **[ANCHOR]** "{name}, your uterus sent a memo."
2. "{name}, welcome to Sustain. The brain that wants to make checklists and finish things is back. Use it."
3. "Morning {name}. Progesterone's running the show now. Slower, steadier, more detail-oriented. That's a feature."
4. "{name}, this is the close-the-tabs, finish-the-projects, file-the-receipts week. Less starting. More finishing."
5. "{name}, you are not less productive in Sustain. You're differently productive. Today is about depth, not novelty."
6. "Hey {name}. If your inner critic is louder this morning, that's progesterone shifting. Don't make decisions she's narrating."
7. "{name}, Sustain. Your brain loves a list today. Make a short one. Win it."
8. "{name}, late Sustain hits like a soft drag. That's biology, not failure. Your job is to work with it, not against it."

### Sign-offs

1. **[ANCHOR]** "You don't need to be a productivity machine today. Eat the carbs, do the gentle yoga, crush that Q2 review. The sourdough believes in you."
2. "Sustain rewards depth and finishing. Pick one open loop. Close it. Call that a win."
3. "If something feels heavier today than it did last week, that's progesterone, not your life. Don't make permanent decisions on temporary chemistry."
4. "Eat protein. Walk after meals. Skip the third coffee. Future-you in late Sustain is begging."
5. "Today, less novelty, more nesting. Cozy clothes, warm food, short list. You're playing the long game."
6. "Your inner critic is loud this week. Write down what she says. Read it again next Rise. You'll laugh."
7. "Skip the heroics. Finish two things. Make tomorrow easier. That's strategy, not laziness."
8. "Sustain is the close-out week. Tie the bows. Send the wrap-ups. Then rest. Restore's around the corner."

---

## After Amanda approves

I'll wire it in like this in `api/briefing.js`:

```js
var DOT_GREETINGS = {
  reflect: [   // Restore
    function(name) { return name + ", gentle morning. Your body did a lot this month. Let's keep it low today."; },
    // ...8 total
  ],
  build: [...],   // Rise
  perform: [...], // Peak
  complete: [...] // Sustain
};

function pickDotGreeting(phaseKey, cycleDay) {
  var bank = DOT_GREETINGS[phaseKey];
  return bank[cycleDay % bank.length];
}
```

Same pattern for sign-offs with a +3 offset so opener/closer don't always pair the same way.

**Fallback rule:** If we ever ship a phase with <6 approved variants, we keep the anchor as #1 and only use what's approved. Never empty bank.

**Note on internal phase keys:** Code still uses old keys (`reflect/build/perform/complete`) internally. The user-facing names (Restore/Rise/Peak/Sustain) are correct in all the copy above. We can rename the keys later as a cleanup; not blocking this fix.
