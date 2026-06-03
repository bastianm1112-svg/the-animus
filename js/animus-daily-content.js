/**
 * Copy and templates for home daily cards (loaded before animus-daily.js).
 */
(function (g) {
  'use strict';

  var STREAK_UNLOCKS = {
    3: {
      title: 'Deeper lens unlocked',
      body: 'Your type under mild stress: you default to your core pattern before you notice. Naming that early prevents spiral.'
    },
    7: {
      title: 'Stress mode brief',
      body: 'Seven days in — you have enough signal. This week, watch for the gap between how you think you show up and how others experience you.'
    },
    30: {
      title: 'Monthly portrait',
      body: 'Thirty-day presence. You are building a real longitudinal picture of yourself, not a one-time label.'
    }
  };

  var WEEKLY_MOOD_INSIGHT = {
    energized: {
      dominant: 'You logged energized most days this week — ride that momentum, but don\'t over-commit.',
      mixed: 'Several energized days — good week to initiate, harder week to finish quietly.'
    },
    neutral: {
      dominant: 'Mostly neutral this week — stable, but check if "fine" is masking something you have not named.',
      mixed: 'A steady neutral week often means your system is conserving energy for something unspoken.'
    },
    drained: {
      dominant: 'Drained showed up often — protect sleep and reduce optional social cost this weekend.',
      mixed: 'Multiple drained days — common when your type gives more than it recovers. One boundary helps.'
    }
  };

  var MBTI_DAY_TIPS = {
    INTJ: [
      'Monday: Set one non-negotiable outcome before inbox.',
      'Tuesday: Delegate one thing you would normally hoard.',
      'Wednesday: Midweek — defend focus; say no once.',
      'Thursday: Test a plan with one trusted person.',
      'Friday: Close one loop; do not open a new empire.',
      'Saturday: Solitude is maintenance, not escape.',
      'Sunday: Preview the week in three bullets only.'
    ],
    INTP: [
      'Monday: Ship one half-finished thought externally.',
      'Tuesday: Time-box research; stop at good enough.',
      'Wednesday: Explain your idea to a non-expert.',
      'Thursday: Pick one debate to exit gracefully.',
      'Friday: Finish a small artifact, not a framework.',
      'Saturday: Play without optimizing the play.',
      'Sunday: One priority — not five interesting ones.'
    ],
    ENTJ: [
      'Monday: Name the owner for the biggest open item.',
      'Tuesday: Praise one person before you critique process.',
      'Wednesday: Midweek — shorten meetings you control.',
      'Thursday: Check if speed is costing trust.',
      'Friday: Decide what not to pursue next week.',
      'Saturday: Recovery is strategic, not weak.',
      'Sunday: Align calendar to one north-star metric.'
    ],
    ENTP: [
      'Monday: Close one tab before opening three.',
      'Tuesday: Follow up on yesterday\'s promise.',
      'Wednesday: Depth hour — one topic only.',
      'Thursday: Sell the idea in one sentence.',
      'Friday: Celebrate a finish, not a start.',
      'Saturday: Novelty is allowed — set a time box.',
      'Sunday: Pick the one thread that matters most.'
    ],
    INFJ: [
      'Monday: Protect morning quiet before other people\'s moods.',
      'Tuesday: Name one feeling you have been carrying silently.',
      'Wednesday: Midweek — one boundary, kindly stated.',
      'Thursday: Check if you are over-adapting again.',
      'Friday: Small ritual to mark the week\'s end.',
      'Saturday: Recharge without guilt.',
      'Sunday: Write one sentence of truth for yourself.'
    ],
    INFP: [
      'Monday: Honor one value in a mundane task.',
      'Tuesday: Create something imperfect on purpose.',
      'Wednesday: Midweek — say no to misaligned energy.',
      'Thursday: Ask if the story you tell yourself is still true.',
      'Friday: Gentle social contact beats isolation.',
      'Saturday: Beauty break — five minutes enough.',
      'Sunday: One intention, not a manifesto.'
    ],
    ENFJ: [
      'Monday: Ask what others need before you orchestrate.',
      'Tuesday: Leave one hour unscheduled for you.',
      'Wednesday: Midweek — receive help once.',
      'Thursday: Notice whose voice is missing in the room.',
      'Friday: Appreciation message — specific, short.',
      'Saturday: You are not responsible for everyone\'s mood.',
      'Sunday: Plan one gathering that actually fills you.'
    ],
    ENFP: [
      'Monday: One commitment finished beats five started.',
      'Tuesday: Channel enthusiasm into a 45-minute sprint.',
      'Wednesday: Midweek — ground with body, not ideas.',
      'Thursday: Check which excitement is avoidance.',
      'Friday: Share joy with someone who gets you.',
      'Saturday: Adventure is optional; rest is not.',
      'Sunday: Choose the project that still feels alive.'
    ],
    ISTJ: [
      'Monday: Update one system that saves future time.',
      'Tuesday: Confirm expectations in writing once.',
      'Wednesday: Midweek — flexibility in one small area.',
      'Thursday: Trust a process you already built.',
      'Friday: Close tasks; defer new obligations.',
      'Saturday: Predictable comfort is valid recovery.',
      'Sunday: Light prep beats Monday panic.'
    ],
    ISFJ: [
      'Monday: Acknowledge your own load, not only others\'.',
      'Tuesday: One act of care includes care for you.',
      'Wednesday: Midweek — delegate a tiny task.',
      'Thursday: Check resentment before it hardens.',
      'Friday: Warm check-in with someone safe.',
      'Saturday: Quiet home time is productive.',
      'Sunday: List what you will not carry next week.'
    ],
    ESTJ: [
      'Monday: Clarify standards — once — then enforce calmly.',
      'Tuesday: Listen before restructuring.',
      'Wednesday: Midweek — praise reliability you depend on.',
      'Thursday: Drop a rule that no longer serves.',
      'Friday: Results review in ten minutes max.',
      'Saturday: Play that is not a performance review.',
      'Sunday: Three priorities for the week, ranked.'
    ],
    ESFJ: [
      'Monday: Host without over-functioning.',
      'Tuesday: Ask for reciprocity explicitly.',
      'Wednesday: Midweek — social battery check.',
      'Thursday: Harmony is not the same as honesty.',
      'Friday: Small tradition with people you choose.',
      'Saturday: Rest if you hosted all week.',
      'Sunday: Plan connection that does not drain you.'
    ],
    ISTP: [
      'Monday: Fix or tune one physical annoyance.',
      'Tuesday: Show competence through action, not lecture.',
      'Wednesday: Midweek — move your body deliberately.',
      'Thursday: Say the practical thing sooner.',
      'Friday: Finish a hands-on task start to end.',
      'Saturday: Solo project is legitimate joy.',
      'Sunday: Minimal plan — maximum freedom.'
    ],
    ISFP: [
      'Monday: One aesthetic choice that matches your mood.',
      'Tuesday: Express without performing.',
      'Wednesday: Midweek — protect creative space.',
      'Thursday: Check if you swallowed a value.',
      'Friday: Gentle experience over big plans.',
      'Saturday: Nature or art — either resets you.',
      'Sunday: One feeling, named out loud.'
    ],
    ESTP: [
      'Monday: Smallest bold move before noon.',
      'Tuesday: Risk with a defined exit.',
      'Wednesday: Midweek — stillness for ten minutes.',
      'Thursday: Listen longer than you react.',
      'Friday: Social win that is not reckless.',
      'Saturday: Motion is medicine — use it.',
      'Sunday: One adventure worth the energy cost.'
    ],
    ESFP: [
      'Monday: Spread light without over-promising.',
      'Tuesday: Finish something fun you started.',
      'Wednesday: Midweek — feel the room, then choose.',
      'Thursday: Depth talk with one person.',
      'Friday: Celebrate someone else genuinely.',
      'Saturday: Joy is allowed to be quiet too.',
      'Sunday: Pick the plan that still sounds exciting.'
    ]
  };

  var SOLO_MOMENTS = [
    { trap: 'a decision trap', fix: 'one small experiment before you commit' },
    { trap: 'over-explaining your position', fix: 'one sentence of intent, then pause' },
    { trap: 'saying yes by reflex', fix: 'one polite delay phrase you reuse today' }
  ];

  function friendMomentLines(myMbti, theirMbti) {
    myMbti = String(myMbti || '').toUpperCase();
    theirMbti = String(theirMbti || '').toUpperCase();
    if (!theirMbti || theirMbti === '—') {
      return {
        friction: 'Their profile is not complete yet — invite them to finish the test.',
        win: 'Compare once they have a type to unlock pair-specific tips.'
      };
    }
    var same = myMbti.charAt(0) === theirMbti.charAt(0);
    var clash = myMbti.charAt(1) !== theirMbti.charAt(1);
    if (same && !clash) {
      return {
        friction: 'You may assume they think like you — check one detail before deciding.',
        win: 'Easy rapport today: mirror their pace, then add one clarifying question.'
      };
    }
    if (clash) {
      return {
        friction: 'Different energy (E/I) — one of you may need space while the other needs talk.',
        win: 'Offer two modes: "quick sync or async update" and let them pick.'
      };
    }
    return {
      friction: 'Different processing (S/N) — facts vs possibilities can talk past each other.',
      win: 'Lead with one concrete example, then ask what they are optimizing for.'
    };
  }

  var GENERIC_PROMPTS = [
    'What felt most true about you today — and what surprised you?',
    'Where did you act from habit instead of intention?',
    'What would you repeat tomorrow if you could design the day again?'
  ];

  var GENERIC_CHALLENGES = [
    'Name one small decision today and say which value it served.',
    'Send one message of appreciation without expecting a reply.',
    'Spend ten minutes offline noticing what your body is asking for.'
  ];

  var MBTI_PROMPTS = {
    INTJ: 'What long-term outcome are you optimizing for this week — and what are you ignoring to get there?',
    INTP: 'What idea did you test in your head today without sharing it? What would change if you shared it?',
    ENTJ: 'What outcome needs an owner on your plate — delegate or decide by end of day.',
    ENTP: 'Pick one thread you opened today and either close it or schedule a follow-up.',
    INFJ: 'What did you sense in someone else that you have not named yet — consider one honest check-in.',
    INFP: 'Which value felt violated or honored today? Write one sentence about each.',
    ENFJ: 'Who on your periphery might need a specific offer of help — not generic support?',
    ENFP: 'What excited you today that you could finish in under twenty minutes?',
    ISTJ: 'What process saved you time today — document it in one line for future you.',
    ISFJ: 'Who carried invisible labor around you today — acknowledge it directly.',
    ESTJ: 'What standard are you holding that no longer serves the team — revisit or explain it.',
    ESFJ: 'What social ritual would strengthen your circle this week — initiate it.',
    ISTP: 'What problem did you solve with your hands or tools today — note the method.',
    ISFP: 'What beauty did you notice for under a minute — describe it in three words.',
    ESTP: 'What risk is worth taking before the day ends — define the smallest version.',
    ESFP: 'What moment of joy can you recreate tomorrow — name the trigger.'
  };

  var MBTI_CHALLENGES = {
    INTJ: 'Block 25 minutes for deep work with notifications off — protect the plan.',
    INTP: 'Explain one belief you hold to someone patient — clarity beats correctness.',
    ENTJ: 'Give one piece of direct feedback with a concrete next step attached.',
    ENTP: 'Finish one open loop you started this week before opening a new one.',
    INFJ: 'Journal one boundary you need — one sentence, no justification.',
    INFP: 'Do one creative act for yourself only — no audience required.',
    ENFJ: 'Facilitate one conversation so quieter voices get the floor first.',
    ENFP: 'Channel enthusiasm into one deliverable due within 48 hours.',
    ISTJ: 'Improve one checklist item you use weekly — make it shorter and clearer.',
    ISFJ: 'Rest without guilt for twenty minutes — schedule it like an obligation.',
    ESTJ: 'Remove one unnecessary rule from a process you control.',
    ESFJ: 'Plan a low-effort gathering or check-in for someone you miss.',
    ISTP: 'Fix or tune one physical thing in your space — completion matters.',
    ISFP: 'Change one aesthetic detail in your environment to match your mood.',
    ESTP: 'Take one bold social or physical action you have been postponing.',
    ESFP: 'Share one positive moment with someone who was not there.'
  };

  g.AnimusDailyContent = {
    STREAK_UNLOCKS: STREAK_UNLOCKS,
    WEEKLY_MOOD_INSIGHT: WEEKLY_MOOD_INSIGHT,
    MBTI_DAY_TIPS: MBTI_DAY_TIPS,
    SOLO_MOMENTS: SOLO_MOMENTS,
    GENERIC_PROMPTS: GENERIC_PROMPTS,
    GENERIC_CHALLENGES: GENERIC_CHALLENGES,
    MBTI_PROMPTS: MBTI_PROMPTS,
    MBTI_CHALLENGES: MBTI_CHALLENGES,
    friendMomentLines: friendMomentLines
  };
})(typeof window !== 'undefined' ? window : globalThis);
