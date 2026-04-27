/**
 * PeakHer Daily Briefing, v3 (AI-enriched + structured sections)
 * Shows a rich "cycle weather report" card at the top of the check-in screen.
 * Fetches from GET /api/briefing and falls back to a local computation
 * when the server is unavailable or the user is offline.
 *
 * v2 additions:
 *   - Renders AI-generated 6-section briefings (phaseOverview, nutrition,
 *     movement, focus, emotionalWeather, keyInsight)
 *   - Falls back to v1 collapsible sections if AI data is missing
 *   - Supports coach_voice indicator badge
 *
 * v3 additions:
 *   - Dot Greeting rendered at top with phase color
 *   - Calendar Intelligence: meeting cards with energy tags (green/yellow/red)
 *   - Movement Do/Skip: side-by-side green/red cards
 *   - Nutrition Eat/Ease: two-column food items
 *   - Fasting Intelligence: protocol, visual windows, explanation
 *   - Dot Sign-off: avatar + phase-specific sign-off at bottom
 *   - Small 32px Dot avatar next to briefing title
 *   - Phase color accents throughout (Restore/Rise/Peak/Sustain)
 *   - Backward compatible: renders new format if present, falls back to v2/v1
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Briefing = (function () {
  'use strict';

  var Store  = window.PeakHer.Store;
  var Cycle  = window.PeakHer.Cycle;
  var Utils  = window.PeakHer.Utils;
  var API    = window.PeakHer.API;

  // ── Phase colors (v3) ────────────────────────────────────────────────
  var PHASE_COLORS = {
    menstrual: '#9B30FF', restore: '#9B30FF',
    follicular: '#00E5A0', rise: '#00E5A0',
    ovulatory: '#FFD700', peak: '#FFD700',
    luteal: '#FF6B6B', sustain: '#FF6B6B'
  };

  // ── Dot avatar SVG (32px for inline, returns HTML string) ────────────
  function dotAvatarSVG(size) {
    size = size || 32;
    var scale = size / 100;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100" fill="none" style="vertical-align:middle;">' +
      '<circle cx="50" cy="48" r="32" fill="url(#dotGradBrief)"/>' +
      '<ellipse cx="40" cy="46" rx="4.5" ry="5" fill="#2D0A31"/>' +
      '<ellipse cx="60" cy="46" rx="4.5" ry="5" fill="#2D0A31"/>' +
      '<circle cx="42" cy="44" r="1.8" fill="#fff"/>' +
      '<circle cx="62" cy="44" r="1.8" fill="#fff"/>' +
      '<path d="M44 58 Q50 62 56 58" stroke="#2D0A31" stroke-width="1.8" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="34" cy="54" rx="5" ry="3" fill="#9B30FF" opacity="0.2"/>' +
      '<ellipse cx="66" cy="54" rx="5" ry="3" fill="#9B30FF" opacity="0.2"/>' +
      '<defs><radialGradient id="dotGradBrief" cx="0.38" cy="0.32" r="0.68">' +
      '<stop offset="0%" stop-color="#FF5A9E"/><stop offset="100%" stop-color="#D91A65"/>' +
      '</radialGradient></defs></svg>';
  }

  // ── Phase content database (v1 local fallback) ────────────────────────
  var PHASE_CONTENT = {
    menstrual: [
      {
        headline: 'Your body is doing important work right now.',
        summary: 'This is your inner winter. Your hormones are at their lowest, which means your brain is primed for reflection and honest self-assessment. Honor the slower pace. It\'s not laziness, it\'s biology.',
        work: { tip: 'Review and evaluate rather than launch. Your analytical thinking is actually sharpest now.', doThis: 'Audit last month\'s projects, journaling, strategic planning', skipThis: 'Big presentations, networking events, new project kickoffs' },
        fitness: { tip: 'Gentle movement supports recovery without depleting your already-low energy reserves.', doThis: 'Walking, gentle yoga, stretching, light swimming', skipThis: 'HIIT, heavy lifting, marathon training sessions' },
        nutrition: { tip: 'Your body is losing iron and needs extra nourishment. Warm, mineral-rich foods help.', doThis: 'Dark leafy greens, red meat or lentils, warm soups, dark chocolate', skipThis: 'Excessive caffeine, alcohol, very cold or raw foods' },
        social: { tip: 'Social battery runs low during this phase. Protect your energy without guilt.', doThis: 'Small gatherings with close friends, meaningful 1-on-1 conversations', skipThis: 'Large parties, emotionally draining people, over-scheduling' },
        funFact: 'During menstruation, the two hemispheres of your brain communicate more than at any other time in your cycle, making this a powerful phase for creative problem-solving and integrative thinking.'
      },
      {
        headline: 'Permission to slow down. Granted.',
        summary: 'Think of this as your quarterly review phase. While your body resets, your mind is uniquely wired for big-picture thinking. The most productive thing you can do right now is rest strategically.',
        work: { tip: 'Your inner critic is quieter now, so use it for honest evaluation.', doThis: 'Budget reviews, goal-setting, reading and research, skill assessment', skipThis: 'Cold outreach, conflict resolution, high-stakes negotiations' },
        fitness: { tip: 'Movement should feel restorative, not punishing.', doThis: 'Restorative yoga, nature walks, foam rolling, Pilates mat work', skipThis: 'Competitive sports, endurance training, boot camps' },
        nutrition: { tip: 'Magnesium and omega-3s are your best friends this week.', doThis: 'Salmon, walnuts, bananas, warm herbal teas, bone broth', skipThis: 'Sugar binges, skipping meals, excess dairy' },
        social: { tip: 'This is a time for depth over breadth in relationships.', doThis: 'Heart-to-heart chats, cozy movie nights, phone calls with your person', skipThis: 'Networking mixers, hosting duties, emotionally heavy favors' },
        funFact: 'Ancient cultures often considered menstruation a time of heightened intuition. Modern research backs this up: progesterone drops during your period, which can reduce anxiety and increase clarity.'
      }
    ],
    follicular: [
      {
        headline: 'Your brain just got a fresh software update.',
        summary: 'Estrogen is climbing and bringing your energy, creativity, and optimism with it. This is your inner spring, and everything feels a little more possible. Use this momentum to plant seeds for what you want to grow.',
        work: { tip: 'Your brain is hungry for novelty and is forming new neural connections faster.', doThis: 'Brainstorming sessions, learning new skills, starting projects, creative work', skipThis: 'Repetitive admin tasks, detailed editing, routine maintenance' },
        fitness: { tip: 'Rising estrogen means faster muscle recovery and higher pain tolerance.', doThis: 'Try new workout classes, increase intensity, strength training, cardio', skipThis: 'Only gentle exercise; your body can handle more now' },
        nutrition: { tip: 'Your metabolism is at its most efficient. Lighter, fresh foods feel great.', doThis: 'Fresh salads, fermented foods, lean proteins, colorful vegetables', skipThis: 'Heavy comfort foods, excessive carbs, skipping protein' },
        social: { tip: 'Your verbal fluency and social confidence are rising with estrogen.', doThis: 'Networking, first dates, team collaborations, making new connections', skipThis: 'Isolation, avoiding social opportunities, playing small' },
        funFact: 'During the follicular phase, your hippocampus (memory center) actually increases in volume. You literally have more brain capacity for learning right now.'
      },
      {
        headline: 'Spring has sprung inside your body.',
        summary: 'Your follicular phase is like nature waking up after winter. Estrogen is your growth hormone right now, boosting mood, sharpening cognition, and making you more resilient to stress. Lean into the rising energy.',
        work: { tip: 'This is your innovation window, and new ideas come easiest now.', doThis: 'Product ideation, writing, course creation, strategic pivots', skipThis: 'Closing complex deals (save for ovulatory), tedious bookkeeping' },
        fitness: { tip: 'Your body is building and you recover faster than at any other point.', doThis: 'Progressive overload, dance workouts, rock climbing, running', skipThis: 'Rest days only; your body wants to move' },
        nutrition: { tip: 'Support the estrogen rise with gut-friendly and phytoestrogen-rich foods.', doThis: 'Flaxseeds, sprouted grains, citrus fruits, probiotic-rich foods', skipThis: 'Processed foods, excessive sugar, heavy meals before bed' },
        social: { tip: 'You\'re naturally more curious and open to new perspectives right now.', doThis: 'Join a new group, have that bold conversation, pitch your ideas', skipThis: 'Playing it safe, sticking only to your comfort zone' },
        funFact: 'Estrogen boosts serotonin and dopamine production, which is why you may feel more optimistic and adventurous during your follicular phase. It\'s not just mood. It\'s chemistry.'
      }
    ],
    ovulatory: [
      {
        headline: 'You\'re literally glowing. Science says so.',
        summary: 'Estrogen and testosterone both peak during ovulation, making this your biological power window. Your verbal skills, confidence, and charisma are at their highest. This is the time to be seen, heard, and bold.',
        work: { tip: 'Your communication skills peak now, so use your voice.', doThis: 'Pitches, presentations, difficult conversations, sales calls, interviews', skipThis: 'Hiding behind email, avoiding visibility, solo deep-work only' },
        fitness: { tip: 'Peak hormones mean peak performance, but watch your joints.', doThis: 'High-intensity training, group fitness, competitive sports, PR attempts', skipThis: 'Overstretching (ligaments are laxer now), ignoring warm-ups' },
        nutrition: { tip: 'Your body temperature rises slightly, so lighter meals and hydration matter more.', doThis: 'Raw vegetables, light grains, anti-inflammatory foods, plenty of water', skipThis: 'Heavy red meat, excess sodium, dehydration' },
        social: { tip: 'You\'re magnetic right now, and people are drawn to your energy.', doThis: 'Host events, lead meetings, go on dates, have important relationship talks', skipThis: 'Canceling plans, downplaying your presence, people-pleasing' },
        funFact: 'Research shows that voices, faces, and even body scent become measurably more attractive during ovulation. Your body is literally optimized for connection right now.'
      },
      {
        headline: 'Main character energy: activated.',
        summary: 'This is your inner summer: warm, bright, and full of life. Both estrogen and testosterone are peaking, giving you the confidence to take up space. Schedule your most important moments here.',
        work: { tip: 'Your persuasion skills and quick thinking are at their peak.', doThis: 'Close deals, lead workshops, record videos, ask for the raise', skipThis: 'Detailed proofreading, solo admin work, playing small' },
        fitness: { tip: 'You have the most raw power available right now.', doThis: 'Sprints, heavy squats, challenging hikes, dance cardio', skipThis: 'Skipping workouts entirely, ignoring joint warm-ups' },
        nutrition: { tip: 'Support the hormonal peak with anti-inflammatory and liver-supporting foods.', doThis: 'Cruciferous vegetables, berries, turmeric, green tea', skipThis: 'Alcohol binges, sugar crashes, skipping meals' },
        social: { tip: 'Your empathy and social reading skills are dialed up.', doThis: 'Team building, mentoring, community events, vulnerability in relationships', skipThis: 'Avoiding connection, over-giving to the point of burnout' },
        funFact: 'During ovulation, women score higher on verbal fluency tests and show increased activity in brain areas associated with reward and social cognition. You\'re neurologically wired to connect and communicate.'
      }
    ],
    luteal: [
      {
        headline: 'Your inner project manager just clocked in.',
        summary: 'Progesterone is rising, shifting your brain from "create new things" to "finish what you started." Your attention to detail, organizational skills, and BS-detector are all heightened. Use this phase to close loops.',
        work: { tip: 'Detail-oriented work feels natural, so lean into your editing brain.', doThis: 'Proofreading, financial reviews, project wrap-ups, process documentation', skipThis: 'Starting brand-new projects, impulsive business decisions' },
        fitness: { tip: 'Progesterone raises your core temperature and changes how you metabolize fuel.', doThis: 'Moderate strength training, yoga, steady-state cardio, Pilates', skipThis: 'Extreme HIIT, hot yoga, pushing through exhaustion' },
        nutrition: { tip: 'You burn 100-300 more calories per day in the luteal phase. Eat more.', doThis: 'Complex carbs, root vegetables, healthy fats, magnesium-rich foods', skipThis: 'Restrictive dieting, excessive caffeine, ignoring cravings entirely' },
        social: { tip: 'You may feel more introverted. That\'s progesterone doing its thing.', doThis: 'Quality time with your inner circle, setting boundaries, cozy activities', skipThis: 'Over-committing socially, saying yes when you mean no' },
        funFact: 'Progesterone is literally a calming neurosteroid. It acts on GABA receptors in your brain, the same receptors targeted by anti-anxiety medications. Your body makes its own chill pill.'
      },
      {
        headline: 'Finish line energy. Let\'s close some loops.',
        summary: 'This is your inner autumn, a time for harvesting what you\'ve built and preparing for the next cycle. Your left brain is dominant now, making you excellent at organizing, editing, and completing tasks.',
        work: { tip: 'Channel the critical thinking into productive outcomes.', doThis: 'Editing content, debugging code, quality assurance, invoicing', skipThis: 'Launching untested ideas, making permanent decisions while emotional' },
        fitness: { tip: 'As the phase progresses, dial down intensity to match your declining energy.', doThis: 'Walking, swimming, moderate weights, barre classes', skipThis: 'Punishing yourself for lower performance, extreme fasting plus exercise' },
        nutrition: { tip: 'Serotonin production drops, and complex carbs help your brain make more.', doThis: 'Sweet potatoes, oatmeal, brown rice, dark chocolate, seeds', skipThis: 'Binge eating, excess alcohol, very low-carb diets' },
        social: { tip: 'Your tolerance for nonsense drops. That\'s not PMS. It\'s clarity.', doThis: 'Honest conversations, clearing the air, low-key plans with trusted people', skipThis: 'Suppressing how you feel, big social obligations, conflict avoidance' },
        funFact: 'The heightened sensitivity many women feel before their period is linked to a temporary drop in serotonin. It\'s not that you\'re "too sensitive"; your brain is actually processing emotions with less of its usual buffer.'
      }
    ]
  };

  var SECTION_ICONS = {
    work: '\uD83D\uDCBC',
    fitness: '\uD83C\uDFCB\uFE0F',
    nutrition: '\uD83E\uDD57',
    social: '\uD83D\uDC9C'
  };

  var SECTION_LABELS = {
    work: 'Work & Productivity',
    fitness: 'Fitness & Movement',
    nutrition: 'Nutrition & Fuel',
    social: 'Relationships & Social'
  };

  // v2 section config
  var AI_SECTION_CONFIG = [
    { key: 'nutrition',         icon: '\uD83E\uDD57', label: 'Nutrition & Fuel' },
    { key: 'movement',          icon: '\uD83C\uDFCB\uFE0F', label: 'Movement & Fitness' },
    { key: 'focus',             icon: '\uD83C\uDFAF', label: 'Focus & Productivity' },
    { key: 'emotionalWeather',  icon: '\uD83D\uDC9C', label: 'Emotional Weather' }
  ];

  // ── Helpers ──────────────────────────────────────────────────────────

  function getPhaseColor(phase) {
    return PHASE_COLORS[phase] || PHASE_COLORS[(phase || '').toLowerCase()] || '#2d8a8a';
  }

  function getEnergyBadge(level) {
    var colors = {
      green: { bg: '#e6f9f0', color: '#059669', label: 'High Energy' },
      yellow: { bg: '#fef9e7', color: '#d97706', label: 'Moderate' },
      red: { bg: '#fef2f2', color: '#dc2626', label: 'Low Energy' }
    };
    var cfg = colors[level] || colors.yellow;
    return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;' +
      'background:' + cfg.bg + ';color:' + cfg.color + ';">' + cfg.label + '</span>';
  }

  // ── Detect v3 structured data ────────────────────────────────────────
  function hasV3Data(data) {
    return data && (
      data.dotGreeting ||
      data.calendarIntelligence ||
      data.movementDoSkip ||
      data.nutritionEatEase ||
      data.fastingIntelligence ||
      data.dotSignoff
    );
  }

  // ── Local briefing builder ──────────────────────────────────────────

  function buildLocalBriefing() {
    var cycleProfile = Store.getCycleProfile();
    var trackingOn = Cycle.isTrackingEnabled();

    if (!trackingOn || !cycleProfile) return null;

    var cycleDay = Cycle.getCycleDay(
      cycleProfile.lastPeriodStart,
      cycleProfile.averageCycleLength,
      new Date()
    );

    if (!cycleDay) return null;

    var phase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
    var mode = Cycle.getPerformanceMode(phase);
    var phaseContent = PHASE_CONTENT[phase];

    if (!phaseContent || phaseContent.length === 0) return null;

    var contentIndex = (cycleDay - 1) % phaseContent.length;
    var content = phaseContent[contentIndex];

    var streak = Store.getStreak();
    var today = Utils.getToday();
    var todayCheckin = Store.getCheckin(today);

    return {
      phase: phase,
      mode: mode,
      cycleDay: cycleDay,
      cycleLength: cycleProfile.averageCycleLength,
      headline: content.headline,
      summary: content.summary,
      recommendations: {
        work: content.work,
        fitness: content.fitness,
        nutrition: content.nutrition,
        social: content.social
      },
      funFact: content.funFact,
      streak: streak.current > 0 ? streak : null,
      checkedInToday: !!todayCheckin
    };
  }

  // ── Render ────────────────────────────────────────────────────────

  function render(data) {
    var target = document.getElementById('briefing-container');
    if (!target) return;

    if (!data) {
      target.innerHTML = '';
      return;
    }

    // Empty state: logged-in user with no cycle data set yet.
    // Backend signals this with phase: null + cycleDay: null. Without cycle
    // data, the daily-mode fallback looks generic and confusing — show a
    // clear "set your period date" CTA instead.
    if (!data.phase && !data.cycleDay) {
      renderNoCycleDataEmptyState(target);
      return;
    }

    // v3 structured sections (new format)
    if (hasV3Data(data)) {
      renderV3(target, data);
      return;
    }

    // If we have AI-enriched data, use the v2 renderer
    if (data.aiBriefing) {
      renderV2(target, data);
      return;
    }

    // Otherwise fall back to v1 renderer
    renderV1(target, data);
  }

  function renderNoCycleDataEmptyState(target) {
    var html = '';
    html += '<div class="briefing-phase-bar" style="background:#2d8a8a;"></div>';
    html += '<div style="padding:24px 20px 8px;display:flex;align-items:flex-start;gap:12px;">';
    html += '<div style="flex-shrink:0;margin-top:2px;">' + dotAvatarSVG(40) + '</div>';
    html += '<div>';
    html += '<div style="font-size:22px;font-weight:700;color:#2d8a8a;line-height:1.3;margin-bottom:6px;">Hey, I need one thing from you.</div>';
    html += '<div style="font-size:15px;color:rgba(255,255,255,0.85);line-height:1.5;">Set your last period date and I&rsquo;ll show you your phase, today&rsquo;s plan, and the week ahead.</div>';
    html += '</div></div>';
    html += '<div style="padding:12px 20px 20px;">';
    html += '<button id="briefing-set-cycle-cta" style="width:100%;padding:14px 20px;background:#FF6B6B;border:none;border-radius:12px;color:#fff;font-weight:700;font-size:15px;cursor:pointer;">Set my cycle data &rarr;</button>';
    html += '</div>';
    html += '<div style="padding:0 20px 20px;font-size:13px;color:rgba(255,255,255,0.6);text-align:center;line-height:1.5;">Without a period date, I can&rsquo;t show you Restore, Rise, Peak, or Sustain &mdash; and that&rsquo;s the whole point.</div>';
    target.innerHTML = html;
    var btn = document.getElementById('briefing-set-cycle-cta');
    if (btn) {
      btn.addEventListener('click', function () {
        if (window.PeakHer && window.PeakHer.Settings && window.PeakHer.Settings.open) {
          window.PeakHer.Settings.open();
        }
      });
    }
  }


  // ── v3 Renderer (structured sections with Dot personality) ────────

  function renderV3(target, data) {
    var phase = data.phase || '';
    var color = getPhaseColor(phase);
    var phaseBadgeClasses = {
      menstrual: 'badge-reflect', restore: 'badge-reflect',
      follicular: 'badge-build', rise: 'badge-build',
      ovulatory: 'badge-perform', peak: 'badge-perform',
      luteal: 'badge-complete', sustain: 'badge-complete'
    };
    var badgeClass = phaseBadgeClasses[phase] || 'badge-teal';
    var emoji = data.phaseEmoji || (Cycle.getPhaseEmoji ? Cycle.getPhaseEmoji(phase) : '');
    var modeName = data.phaseName || '';

    var html = '';

    // Phase accent bar
    html += '<div class="briefing-phase-bar" style="background:' + color + ';"></div>';

    // ── Dot Greeting ──
    if (data.dotGreeting) {
      html += '<div style="padding:20px 20px 0;display:flex;align-items:flex-start;gap:12px;">';
      html += '<div style="flex-shrink:0;margin-top:2px;">' + dotAvatarSVG(32) + '</div>';
      html += '<div>';
      html += '<div style="font-size:22px;font-weight:700;color:' + color + ';line-height:1.3;margin-bottom:4px;">' + escapeHtml(data.dotGreeting) + '</div>';
      html += '</div>';
      html += '</div>';
    }

    // Header row: phase badge + cycle day
    html += '<div class="briefing-header">';
    html += '<span class="briefing-phase-badge ' + badgeClass + '">' + emoji + ' ' + modeName + '</span>';
    if (data.cycleDay && data.totalCycleDays) {
      html += '<span class="briefing-cycle-day">Day ' + data.cycleDay + ' of ' + data.totalCycleDays + '</span>';
    }
    html += '</div>';

    // Phase Overview (from aiBriefing if present)
    if (data.aiBriefing && data.aiBriefing.phaseOverview) {
      html += '<div class="briefing-headline">' + escapeHtml(data.aiBriefing.phaseOverview.headline) + '</div>';
      html += '<div class="briefing-summary">' + escapeHtml(data.aiBriefing.phaseOverview.summary) + '</div>';
    }

    // ── Calendar Intelligence ──
    if (data.calendarIntelligence) {
      var cal = data.calendarIntelligence;
      html += '<div class="briefing-v3-section">';
      html += '<div class="briefing-v3-section-title" style="border-left:3px solid ' + color + ';padding-left:12px;">&#128197; Calendar Intelligence</div>';
      if (cal.summary) {
        html += '<p class="briefing-v3-text">' + escapeHtml(cal.summary) + '</p>';
      }
      if (cal.meetings && cal.meetings.length > 0) {
        for (var m = 0; m < cal.meetings.length; m++) {
          var mtg = cal.meetings[m];
          html += '<div class="briefing-meeting-card">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
          html += '<strong style="font-size:14px;">' + escapeHtml(mtg.title || 'Meeting') + '</strong>';
          if (mtg.energy) {
            html += getEnergyBadge(mtg.energy);
          }
          html += '</div>';
          if (mtg.time) {
            html += '<div style="font-size:12px;color:#6b7280;margin-bottom:4px;">' + escapeHtml(mtg.time) + '</div>';
          }
          if (mtg.advice) {
            html += '<div style="font-size:13px;color:#374151;font-style:italic;">' + escapeHtml(mtg.advice) + '</div>';
          }
          html += '</div>';
        }
      }
      html += '</div>';
    }

    // ── Movement Do/Skip ──
    if (data.movementDoSkip) {
      var mv = data.movementDoSkip;
      html += '<div class="briefing-v3-section">';
      html += '<div class="briefing-v3-section-title" style="border-left:3px solid ' + color + ';padding-left:12px;">&#127947;&#65039; Movement</div>';
      if (mv.summary) {
        html += '<p class="briefing-v3-text">' + escapeHtml(mv.summary) + '</p>';
      }
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
      // Do This card
      html += '<div style="background:#e6f9f0;border-radius:10px;padding:14px;">';
      html += '<div style="font-size:13px;font-weight:700;color:#059669;margin-bottom:6px;">Do This</div>';
      if (mv.doThis) {
        var doItems = Array.isArray(mv.doThis) ? mv.doThis : [mv.doThis];
        for (var d = 0; d < doItems.length; d++) {
          html += '<div style="font-size:13px;color:#374151;margin-bottom:3px;">' + escapeHtml(doItems[d]) + '</div>';
        }
      }
      html += '</div>';
      // Skip This card
      html += '<div style="background:#fef2f2;border-radius:10px;padding:14px;">';
      html += '<div style="font-size:13px;font-weight:700;color:#dc2626;margin-bottom:6px;">Skip This</div>';
      if (mv.skipThis) {
        var skipItems = Array.isArray(mv.skipThis) ? mv.skipThis : [mv.skipThis];
        for (var s = 0; s < skipItems.length; s++) {
          html += '<div style="font-size:13px;color:#374151;margin-bottom:3px;">' + escapeHtml(skipItems[s]) + '</div>';
        }
      }
      html += '</div>';
      html += '</div>';
      html += '</div>';
    }

    // ── Nutrition Eat/Ease ──
    if (data.nutritionEatEase) {
      var nut = data.nutritionEatEase;
      html += '<div class="briefing-v3-section">';
      html += '<div class="briefing-v3-section-title" style="border-left:3px solid ' + color + ';padding-left:12px;">&#129367; Nutrition</div>';
      if (nut.summary) {
        html += '<p class="briefing-v3-text">' + escapeHtml(nut.summary) + '</p>';
      }
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
      // Eat column
      html += '<div style="background:#e6f9f0;border-radius:10px;padding:14px;">';
      html += '<div style="font-size:13px;font-weight:700;color:#059669;margin-bottom:6px;">Eat</div>';
      if (nut.eat) {
        var eatItems = Array.isArray(nut.eat) ? nut.eat : [nut.eat];
        for (var e = 0; e < eatItems.length; e++) {
          html += '<div style="font-size:13px;color:#374151;margin-bottom:3px;">' + escapeHtml(eatItems[e]) + '</div>';
        }
      }
      html += '</div>';
      // Ease column
      html += '<div style="background:#fef9e7;border-radius:10px;padding:14px;">';
      html += '<div style="font-size:13px;font-weight:700;color:#d97706;margin-bottom:6px;">Ease Up On</div>';
      if (nut.ease) {
        var easeItems = Array.isArray(nut.ease) ? nut.ease : [nut.ease];
        for (var ea = 0; ea < easeItems.length; ea++) {
          html += '<div style="font-size:13px;color:#374151;margin-bottom:3px;">' + escapeHtml(easeItems[ea]) + '</div>';
        }
      }
      html += '</div>';
      html += '</div>';
      html += '</div>';
    }

    // ── Fasting Intelligence ──
    if (data.fastingIntelligence) {
      var fast = data.fastingIntelligence;
      html += '<div class="briefing-v3-section">';
      html += '<div class="briefing-v3-section-title" style="border-left:3px solid ' + color + ';padding-left:12px;">&#9201;&#65039; Fasting Intelligence</div>';
      if (fast.protocol) {
        html += '<div style="font-size:15px;font-weight:700;color:' + color + ';margin-bottom:6px;">' + escapeHtml(fast.protocol) + '</div>';
      }
      // Visual fasting window bar
      if (fast.eatStart && fast.eatEnd) {
        html += '<div style="background:#f3f0ec;border-radius:8px;height:28px;position:relative;overflow:hidden;margin-bottom:10px;">';
        // Calculate approximate positions (assuming 24h day)
        var startH = parseTimeHour(fast.eatStart);
        var endH = parseTimeHour(fast.eatEnd);
        var leftPct = (startH / 24 * 100).toFixed(1);
        var widthPct = ((endH - startH) / 24 * 100).toFixed(1);
        if (endH > startH) {
          html += '<div style="position:absolute;left:' + leftPct + '%;width:' + widthPct + '%;height:100%;background:' + color + ';opacity:0.3;border-radius:8px;"></div>';
          html += '<div style="position:absolute;left:' + leftPct + '%;width:' + widthPct + '%;height:100%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + color + ';">' +
            escapeHtml(fast.eatStart) + ' - ' + escapeHtml(fast.eatEnd) + '</div>';
        }
        html += '</div>';
      }
      if (fast.explanation) {
        html += '<p class="briefing-v3-text">' + escapeHtml(fast.explanation) + '</p>';
      }
      html += '</div>';
    }

    // ── AI Briefing sections (v2 accordion, if present alongside v3 data) ──
    if (data.aiBriefing) {
      var ai = data.aiBriefing;
      var hasAISections = false;
      for (var a = 0; a < AI_SECTION_CONFIG.length; a++) {
        if (ai[AI_SECTION_CONFIG[a].key]) { hasAISections = true; break; }
      }
      if (hasAISections) {
        html += '<div class="briefing-sections">';
        for (var i = 0; i < AI_SECTION_CONFIG.length; i++) {
          var cfg = AI_SECTION_CONFIG[i];
          var sectionData = ai[cfg.key];
          if (!sectionData) continue;

          var sectionId = 'briefing-v3-ai-section-' + cfg.key;
          html += '<div class="briefing-section">';
          html += '<button class="briefing-section-toggle" data-section="' + sectionId + '" type="button">';
          html += '<span class="section-icon">' + cfg.icon + '</span>';
          html += '<span>' + escapeHtml(sectionData.headline || cfg.label) + '</span>';
          html += '<span class="section-arrow">\u25BC</span>';
          html += '</button>';
          html += '<div class="briefing-section-body" id="' + sectionId + '">';
          html += '<div class="briefing-section-content">';
          html += '<p>' + escapeHtml(sectionData.body) + '</p>';
          html += '</div>';
          html += '</div>';
          html += '</div>';
        }
        html += '</div>';
      }
    }

    // Key Insight
    if (data.aiBriefing && data.aiBriefing.keyInsight) {
      html += '<div class="briefing-key-insight">';
      html += '<div class="briefing-key-insight-label">\uD83D\uDD11 Key Insight</div>';
      html += '<div class="briefing-key-insight-text">' + escapeHtml(data.aiBriefing.keyInsight) + '</div>';
      html += '</div>';
    }

    // Fun fact
    if (data.funFact) {
      html += '<div class="briefing-funfact"><strong>Did you know? </strong>' + escapeHtml(data.funFact) + '</div>';
    }

    // Streak
    var streakCount = data.streakInfo ? data.streakInfo.current : (data.streak ? data.streak.current : 0);
    if (streakCount > 1) {
      html += '<div class="briefing-streak">\uD83D\uDD25 ' + streakCount + '-day check-in streak</div>';
    }

    // Check-in prompt
    var checkedIn = data.hasCheckedInToday || data.checkedInToday;
    if (!checkedIn) {
      html += '<div class="briefing-checkin-prompt" style="padding:12px 20px;font-size:13px;color:var(--gray-text,#6b7280);text-align:center;border-top:1px solid rgba(0,0,0,0.04);">';
      html += '\u2728 Check in below to keep your data growing';
      html += '</div>';
    }

    // ── Dot Sign-off ──
    if (data.dotSignoff) {
      html += '<div style="padding:16px 20px;display:flex;align-items:center;gap:10px;border-top:1px solid rgba(0,0,0,0.04);background:rgba(0,0,0,0.01);">';
      html += '<div style="flex-shrink:0;">' + dotAvatarSVG(28) + '</div>';
      html += '<div style="font-size:14px;color:' + color + ';font-weight:600;font-style:italic;">' + escapeHtml(data.dotSignoff) + '</div>';
      html += '</div>';
    }

    target.innerHTML = '<div class="briefing-card">' + html + '</div>';
    attachToggleListeners(target);
  }


  // ── v2 Renderer (AI-enriched 6-section briefing) ──────────────────

  function renderV2(target, data) {
    var phaseColors = {
      menstrual: 'var(--reflect, #9B30FF)', reflect: 'var(--reflect, #9B30FF)',
      follicular: 'var(--build, #00E5A0)', build: 'var(--build, #00E5A0)',
      ovulatory: 'var(--perform, #FFD700)', perform: 'var(--perform, #FFD700)',
      luteal: 'var(--complete, #FF6B6B)', complete: 'var(--complete, #FF6B6B)'
    };
    var phaseBadgeClasses = {
      menstrual: 'badge-reflect', reflect: 'badge-reflect',
      follicular: 'badge-build', build: 'badge-build',
      ovulatory: 'badge-perform', perform: 'badge-perform',
      luteal: 'badge-complete', complete: 'badge-complete'
    };

    var color = phaseColors[data.phase] || 'var(--teal)';
    var badgeClass = phaseBadgeClasses[data.phase] || 'badge-teal';
    var emoji = data.phaseEmoji || (Cycle.getPhaseEmoji ? Cycle.getPhaseEmoji(data.phase) : '');
    var modeName = data.phaseName || '';
    var ai = data.aiBriefing;

    var html = '';

    // Phase accent bar
    html += '<div class="briefing-phase-bar" style="background:' + color + ';"></div>';

    // Header row: phase badge + cycle day (with Dot avatar)
    html += '<div class="briefing-header">';
    html += '<div style="display:flex;align-items:center;gap:8px;">';
    html += dotAvatarSVG(32);
    html += '<span class="briefing-phase-badge ' + badgeClass + '">' + emoji + ' ' + modeName + '</span>';
    html += '</div>';
    if (data.cycleDay && data.totalCycleDays) {
      html += '<span class="briefing-cycle-day">Day ' + data.cycleDay + ' of ' + data.totalCycleDays + '</span>';
    }
    html += '</div>';

    // Section 1: Phase Overview
    if (ai.phaseOverview) {
      html += '<div class="briefing-headline">' + escapeHtml(ai.phaseOverview.headline) + '</div>';
      html += '<div class="briefing-summary">' + escapeHtml(ai.phaseOverview.summary) + '</div>';
    }

    // Sections 2-5: Collapsible AI sections
    html += '<div class="briefing-sections">';

    for (var i = 0; i < AI_SECTION_CONFIG.length; i++) {
      var cfg = AI_SECTION_CONFIG[i];
      var sectionData = ai[cfg.key];
      if (!sectionData) continue;

      var sectionId = 'briefing-v2-section-' + cfg.key;

      html += '<div class="briefing-section">';

      // Toggle button
      html += '<button class="briefing-section-toggle" data-section="' + sectionId + '" type="button">';
      html += '<span class="section-icon">' + cfg.icon + '</span>';
      html += '<span>' + escapeHtml(sectionData.headline || cfg.label) + '</span>';
      html += '<span class="section-arrow">\u25BC</span>';
      html += '</button>';

      // Collapsible body
      html += '<div class="briefing-section-body" id="' + sectionId + '">';
      html += '<div class="briefing-section-content">';
      html += '<p>' + escapeHtml(sectionData.body) + '</p>';
      html += '</div>';
      html += '</div>';

      html += '</div>';
    }

    html += '</div>';

    // Section 6: Key Insight (always visible, highlighted)
    if (ai.keyInsight) {
      html += '<div class="briefing-key-insight">';
      html += '<div class="briefing-key-insight-label">\uD83D\uDD11 Key Insight</div>';
      html += '<div class="briefing-key-insight-text">' + escapeHtml(ai.keyInsight) + '</div>';
      html += '</div>';
    }

    // Fun fact (from static data, as a bonus)
    if (data.funFact) {
      html += '<div class="briefing-funfact"><strong>Did you know? </strong>' + escapeHtml(data.funFact) + '</div>';
    }

    // Streak
    if (data.streakInfo && data.streakInfo.current > 1) {
      html += '<div class="briefing-streak">\uD83D\uDD25 ' + data.streakInfo.current + '-day check-in streak</div>';
    }

    // Check-in prompt
    if (!data.hasCheckedInToday) {
      html += '<div class="briefing-checkin-prompt" style="padding:12px 20px;font-size:13px;color:var(--gray-text,#6b7280);text-align:center;border-top:1px solid rgba(0,0,0,0.04);">';
      html += '\u2728 Check in below to keep your data growing';
      html += '</div>';
    }

    target.innerHTML = '<div class="briefing-card">' + html + '</div>';
    attachToggleListeners(target);
  }


  // ── v1 Renderer (static content, original) ──────────────────────

  function renderV1(target, data) {
    var phaseColors = {
      menstrual: 'var(--reflect, #9B30FF)', reflect: 'var(--reflect, #9B30FF)',
      follicular: 'var(--build, #00E5A0)', build: 'var(--build, #00E5A0)',
      ovulatory: 'var(--perform, #FFD700)', perform: 'var(--perform, #FFD700)',
      luteal: 'var(--complete, #FF6B6B)', complete: 'var(--complete, #FF6B6B)'
    };
    var phaseBadgeClasses = {
      menstrual: 'badge-reflect', reflect: 'badge-reflect',
      follicular: 'badge-build', build: 'badge-build',
      ovulatory: 'badge-perform', perform: 'badge-perform',
      luteal: 'badge-complete', complete: 'badge-complete'
    };

    var phase = data.phase;
    var color = phaseColors[phase] || 'var(--teal)';
    var badgeClass = phaseBadgeClasses[phase] || 'badge-teal';
    var emoji = data.phaseEmoji || (Cycle.getPhaseEmoji ? Cycle.getPhaseEmoji(phase) : '');

    var html = '';

    // Phase accent bar
    html += '<div class="briefing-phase-bar" style="background:' + color + ';"></div>';

    // Header row (with Dot avatar)
    html += '<div class="briefing-header">';
    html += '<div style="display:flex;align-items:center;gap:8px;">';
    html += dotAvatarSVG(32);
    html += '<span class="briefing-phase-badge ' + badgeClass + '">' + emoji + ' ' + (data.phaseName || data.mode || '') + '</span>';
    html += '</div>';
    if (data.cycleDay) {
      var totalDays = data.totalCycleDays || data.cycleLength || '';
      html += '<span class="briefing-cycle-day">Day ' + data.cycleDay + (totalDays ? ' of ' + totalDays : '') + '</span>';
    }
    html += '</div>';

    // Headline
    html += '<div class="briefing-headline">' + escapeHtml(data.headline) + '</div>';

    // Summary
    html += '<div class="briefing-summary">' + escapeHtml(data.summary) + '</div>';

    // Collapsible recommendation sections
    html += '<div class="briefing-sections">';

    var sectionKeys = ['work', 'fitness', 'nutrition', 'social'];
    for (var i = 0; i < sectionKeys.length; i++) {
      var key = sectionKeys[i];
      var rec = data.recommendations ? data.recommendations[key] : null;
      if (!rec) continue;

      var sectionId = 'briefing-section-' + key;

      html += '<div class="briefing-section">';
      html += '<button class="briefing-section-toggle" data-section="' + sectionId + '" type="button">';
      html += '<span class="section-icon">' + SECTION_ICONS[key] + '</span>';
      html += '<span>' + (rec.title || SECTION_LABELS[key]) + '</span>';
      html += '<span class="section-arrow">\u25BC</span>';
      html += '</button>';

      html += '<div class="briefing-section-body" id="' + sectionId + '">';
      html += '<div class="briefing-section-content">';
      html += '<p style="margin-bottom:10px;">' + escapeHtml(rec.tip) + '</p>';
      html += '<div class="briefing-do-skip">';
      html += '<div class="briefing-do"><strong>Do this</strong>' + escapeHtml(rec.doThis) + '</div>';
      html += '<div class="briefing-skip"><strong>Skip this</strong>' + escapeHtml(rec.skipThis) + '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      html += '</div>';
    }

    html += '</div>';

    // Fun fact
    if (data.funFact) {
      html += '<div class="briefing-funfact"><strong>Did you know? </strong>' + escapeHtml(data.funFact) + '</div>';
    }

    // Streak
    var streakCount = data.streakInfo ? data.streakInfo.current : (data.streak ? data.streak.current : 0);
    if (streakCount > 1) {
      html += '<div class="briefing-streak">\uD83D\uDD25 ' + streakCount + '-day check-in streak</div>';
    }

    // Check-in prompt
    var checkedIn = data.hasCheckedInToday || data.checkedInToday;
    if (!checkedIn) {
      html += '<div class="briefing-checkin-prompt" style="padding:12px 20px;font-size:13px;color:var(--gray-text,#6b7280);text-align:center;border-top:1px solid rgba(0,0,0,0.04);">';
      html += '\u2728 Check in below to keep your data growing';
      html += '</div>';
    }

    target.innerHTML = '<div class="briefing-card">' + html + '</div>';
    attachToggleListeners(target);
  }


  function attachToggleListeners(root) {
    var toggleBtns = root.querySelectorAll('.briefing-section-toggle');
    for (var i = 0; i < toggleBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var sectionId = btn.getAttribute('data-section');
          var body = document.getElementById(sectionId);
          if (!body) return;

          var isOpen = body.classList.contains('open');

          // Close all sections first
          var allBodies = root.querySelectorAll('.briefing-section-body');
          var allToggles = root.querySelectorAll('.briefing-section-toggle');
          for (var j = 0; j < allBodies.length; j++) {
            allBodies[j].classList.remove('open');
          }
          for (var k = 0; k < allToggles.length; k++) {
            allToggles[k].classList.remove('open');
          }

          // Toggle the clicked one (if it was closed, open it)
          if (!isOpen) {
            body.classList.add('open');
            btn.classList.add('open');
          }
        });
      })(toggleBtns[i]);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Parse a time string like "12:00 PM" or "14:00" into an hour float (0-24) */
  function parseTimeHour(timeStr) {
    if (!timeStr) return 0;
    var t = timeStr.trim().toUpperCase();
    var pm = t.indexOf('PM') !== -1;
    var am = t.indexOf('AM') !== -1;
    t = t.replace(/[APM\s]/g, '');
    var parts = t.split(':');
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
    return h + m / 60;
  }

  // ── Loading skeleton ──────────────────────────────────────────────

  function renderLoading() {
    var target = document.getElementById('briefing-container');
    if (!target) return;
    var html = '';
    html += '<div class="briefing-card">';
    html += '<div class="briefing-loading-bar"></div>';
    html += '<div class="briefing-loading-header">';
    html += '<div class="briefing-loading-avatar">' + dotAvatarSVG(36) + '</div>';
    html += '<div>';
    html += '<div class="briefing-loading-message">Dot is writing your brief<span class="dots"></span></div>';
    html += '<div class="briefing-loading-subtitle">Reading your cycle, calendar, and check-ins</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="briefing-shimmer-body">';
    html += '<div class="briefing-shimmer-line w-90"></div>';
    html += '<div class="briefing-shimmer-line w-75"></div>';
    html += '<div class="briefing-shimmer-line w-60"></div>';
    html += '<div class="briefing-shimmer-line w-40"></div>';
    html += '</div>';
    html += '</div>';
    target.innerHTML = html;
  }

  // ── Init ──────────────────────────────────────────────────────────

  function init() {
    if (API.isLoggedIn() && typeof API.getBriefing === 'function') {
      renderLoading();
      API.getBriefing()
        .then(function (serverData) {
          if (serverData && (serverData.phase || serverData.phaseName)) {
            render(serverData);
          } else {
            render(buildLocalBriefing());
          }
        })
        .catch(function () {
          render(buildLocalBriefing());
        });
    } else {
      render(buildLocalBriefing());
    }
  }

  function refresh() {
    init();
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    init: init,
    refresh: refresh
  };
})();
