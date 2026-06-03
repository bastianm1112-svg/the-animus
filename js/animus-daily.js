/**
 * Home-only daily features — streak, mood, reflection, challenge, compare nudge.
 */
(function (g) {
  'use strict';

  var MOODS = [
    { id: 'energized', label: 'Energized', icon: '◆' },
    { id: 'neutral', label: 'Neutral', icon: '◇' },
    { id: 'drained', label: 'Drained', icon: '○' }
  ];

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

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayKey() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function dayHash(uid, salt) {
    var s = (uid || '') + todayKey() + (salt || '');
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function pickFrom(list, uid, salt) {
    if (!list || !list.length) return '';
    return list[dayHash(uid, salt) % list.length];
  }

  function escapeHTML(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pickPrompt(profile, uid) {
    var mbti = profile && profile.mbti ? String(profile.mbti).toUpperCase() : '';
    if (mbti && MBTI_PROMPTS[mbti]) return MBTI_PROMPTS[mbti];
    return pickFrom(GENERIC_PROMPTS, uid, 'prompt');
  }

  function pickChallenge(profile, uid) {
    var mbti = profile && profile.mbti ? String(profile.mbti).toUpperCase() : '';
    if (mbti && MBTI_CHALLENGES[mbti]) return MBTI_CHALLENGES[mbti];
    return pickFrom(GENERIC_CHALLENGES, uid, 'challenge');
  }

  function processStreak(db, uid, userData) {
    var today = todayKey();
    var streak = (userData && userData.dailyStreak) || { count: 0, lastDate: null };
    if (streak.lastDate === today) return Promise.resolve(userData);
    var nextCount = streak.lastDate === yesterdayKey() ? (streak.count || 0) + 1 : 1;
    return db
      .collection('users')
      .doc(uid)
      .set({ dailyStreak: { count: nextCount, lastDate: today } }, { merge: true })
      .then(function () {
        if (!g.AnimusXp) return null;
        var chain = [g.AnimusXp.awardXp(db, uid, 'streak_day')];
        if (nextCount === 7) chain.push(g.AnimusXp.awardXp(db, uid, 'streak_milestone_7'));
        if (nextCount === 30) chain.push(g.AnimusXp.awardXp(db, uid, 'streak_milestone_30'));
        return Promise.all(chain);
      })
      .then(function () {
        var next = Object.assign({}, userData || {}, {
          dailyStreak: { count: nextCount, lastDate: today }
        });
        return next;
      });
  }

  function saveMood(db, uid, value, userData) {
    var today = todayKey();
    var cur = userData && userData.dailyMood;
    if (cur && cur.date === today && cur.value === value) return Promise.resolve(userData);
    return db
      .collection('users')
      .doc(uid)
      .set({ dailyMood: { date: today, value: value } }, { merge: true })
      .then(function () {
        var fresh = Object.assign({}, userData || {}, { dailyMood: { date: today, value: value } });
        if (!cur || cur.date !== today) {
          return g.AnimusXp
            ? g.AnimusXp.awardXp(db, uid, 'mood_checkin').then(function () {
                return fresh;
              })
            : fresh;
        }
        return fresh;
      });
  }

  function saveReflection(db, uid, note, userData, promptText) {
    var today = todayKey();
    note = String(note || '').trim().substring(0, 500);
    var cur = userData && userData.dailyReflection;
    var patch = {
      date: today,
      prompt: String(promptText || '').substring(0, 200),
      note: note
    };
    if (cur && cur.date === today && cur.note === note) return Promise.resolve(userData);
    return db
      .collection('users')
      .doc(uid)
      .set({ dailyReflection: patch }, { merge: true })
      .then(function () {
        var fresh = Object.assign({}, userData || {}, { dailyReflection: patch });
        if (note && (!cur || cur.date !== today || !cur.note)) {
          return g.AnimusXp
            ? g.AnimusXp.awardXp(db, uid, 'reflection_note').then(function () {
                return fresh;
              })
            : fresh;
        }
        return fresh;
      });
  }

  function compareNudgeHtml(userData) {
    if (!g.AnimusEntitlements) return '';
    if (g.AnimusEntitlements.hasAnimusPlus(userData)) {
      return (
        '<div class="daily-row daily-compare daily-compare-plus">' +
        '<span class="daily-row-label">Compare</span>' +
        '<p class="daily-row-text">Animus Plus — unlimited compares this month.</p>' +
        '<a href="/compare" class="daily-row-cta">Compare profiles</a>' +
        '</div>'
      );
    }
    var left = g.AnimusEntitlements.getCompareRemaining(userData);
    if (left <= 0) {
      return (
        '<div class="daily-row daily-compare daily-compare-empty">' +
        '<span class="daily-row-label">Compare</span>' +
        '<p class="daily-row-text">You&apos;ve used all free compares this month.</p>' +
        '<a href="/shop" class="daily-row-cta">Get Plus</a>' +
        '</div>'
      );
    }
    return (
      '<div class="daily-row daily-compare">' +
      '<span class="daily-row-label">Compare</span>' +
      '<p class="daily-row-text">' +
      left +
      ' free compare' +
      (left === 1 ? '' : 's') +
      ' left this month.</p>' +
      '<a href="/compare" class="daily-row-cta">Use one</a>' +
      '</div>'
    );
  }

  function render(db, uid, userData, profile, onUserDataRefresh) {
    var mount = document.getElementById('homeDailyExtras');
    if (!mount) return;
    if (!profile || !profile.mbti) {
      mount.innerHTML = '';
      mount.hidden = true;
      return;
    }
    mount.hidden = false;

    var streak = (userData && userData.dailyStreak) || { count: 0, lastDate: null };
    var mood = userData && userData.dailyMood;
    var reflection = userData && userData.dailyReflection;
    var today = todayKey();
    var promptText = pickPrompt(profile, uid);
    var challengeText = pickChallenge(profile, uid);
    var moodToday = mood && mood.date === today ? mood.value : null;
    var reflectionToday = reflection && reflection.date === today ? reflection.note : '';

    var moodButtons = MOODS.map(function (m) {
      var active = moodToday === m.id ? ' is-active' : '';
      return (
        '<button type="button" class="mood-btn' +
        active +
        '" data-mood="' +
        m.id +
        '" aria-pressed="' +
        (moodToday === m.id) +
        '">' +
        '<span class="mood-btn-icon" aria-hidden="true">' +
        m.icon +
        '</span>' +
        '<span class="mood-btn-label">' +
        m.label +
        '</span></button>'
      );
    }).join('');

    mount.innerHTML =
      '<div class="daily-row daily-streak">' +
      '<span class="daily-row-label">Streak</span>' +
      '<div class="daily-streak-stat">' +
      '<span class="daily-streak-count">' +
      (streak.count || 0) +
      '</span>' +
      '<span class="daily-streak-unit">day' +
      (streak.count === 1 ? '' : 's') +
      '</span>' +
      '</div>' +
      '<p class="daily-row-hint">Visit home each day to build your streak.</p>' +
      '</div>' +
      '<div class="daily-row daily-mood">' +
      '<span class="daily-row-label">Mood</span>' +
      '<div class="mood-btn-group" role="group" aria-label="How are you today?">' +
      moodButtons +
      '</div>' +
      '</div>' +
      '<div class="daily-row daily-challenge">' +
      '<span class="daily-row-label">Today&apos;s challenge</span>' +
      '<p class="daily-row-text">' +
      escapeHTML(challengeText) +
      '</p>' +
      '</div>' +
      '<div class="daily-row daily-reflection">' +
      '<span class="daily-row-label">Reflection</span>' +
      '<p class="daily-prompt-text">' +
      escapeHTML(promptText) +
      '</p>' +
      '<textarea class="daily-reflection-input" id="dailyReflectionInput" rows="3" maxlength="500" placeholder="Optional — a sentence is enough">' +
      escapeHTML(reflectionToday) +
      '</textarea>' +
      '<button type="button" class="daily-reflection-save" id="dailyReflectionSave">Save reflection</button>' +
      '</div>' +
      compareNudgeHtml(userData);

    mount.querySelectorAll('.mood-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var val = btn.getAttribute('data-mood');
        saveMood(db, uid, val, userData).then(function (fresh) {
          userData = fresh;
          if (onUserDataRefresh) onUserDataRefresh(fresh);
          render(db, uid, fresh, profile, onUserDataRefresh);
        });
      });
    });

    var saveBtn = document.getElementById('dailyReflectionSave');
    var input = document.getElementById('dailyReflectionInput');
    if (saveBtn && input) {
      saveBtn.addEventListener('click', function () {
        saveReflection(db, uid, input.value, userData, promptText).then(function (fresh) {
          userData = fresh;
          if (onUserDataRefresh) onUserDataRefresh(fresh);
          if (typeof g.showToast === 'function') g.showToast('Reflection saved');
          render(db, uid, fresh, profile, onUserDataRefresh);
        });
      });
    }
  }

  function boot(db, uid, userData, profile, onUserDataRefresh) {
    if (!uid || !profile || !profile.mbti) return Promise.resolve(userData);
    return processStreak(db, uid, userData).then(function (fresh) {
      render(db, uid, fresh, profile, onUserDataRefresh);
      return fresh;
    });
  }

  g.AnimusDaily = {
    boot: boot,
    render: render,
    pickPrompt: pickPrompt,
    pickChallenge: pickChallenge
  };
})(typeof window !== 'undefined' ? window : globalThis);
