/**
 * Home-only daily cards — retention loop, history, streak unlocks, social hooks.
 */
(function (g) {
  'use strict';

  var C = g.AnimusDailyContent || {};
  var MOODS = [
    { id: 'energized', label: 'Energized', icon: '◆' },
    { id: 'neutral', label: 'Neutral', icon: '◇' },
    { id: 'drained', label: 'Drained', icon: '○' }
  ];
  var MOOD_LABEL = { energized: 'energized', neutral: 'neutral', drained: 'drained' };
  var HISTORY_MAX = 14;

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function dateKeyOffset(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function yesterdayKey() {
    return dateKeyOffset(-1);
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

  var escapeHTML = g.AnimusShared.escapeHTML;

  function truncate(s, n) {
    s = String(s || '').trim();
    if (s.length <= n) return s;
    return s.substring(0, n - 1) + '…';
  }

  function normalizeMoodHistory(userData) {
    var hist = (userData && userData.moodHistory) ? userData.moodHistory.slice() : [];
    if (userData && userData.dailyMood && userData.dailyMood.date) {
      var dup = hist.some(function (h) {
        return h.date === userData.dailyMood.date;
      });
      if (!dup) hist.push({ date: userData.dailyMood.date, value: userData.dailyMood.value });
    }
    hist.sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    });
    return hist.slice(0, HISTORY_MAX);
  }

  function normalizeReflectionHistory(userData) {
    var hist = (userData && userData.reflectionHistory) ? userData.reflectionHistory.slice() : [];
    if (userData && userData.dailyReflection && userData.dailyReflection.date) {
      var r = userData.dailyReflection;
      var dup = hist.some(function (h) {
        return h.date === r.date;
      });
      if (!dup && r.note) {
        hist.push({ date: r.date, prompt: r.prompt || '', note: r.note });
      }
    }
    hist.sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    });
    return hist.slice(0, HISTORY_MAX);
  }

  function normalizeArchive(userData) {
    return ((userData && userData.dailyArchive) || []).slice().sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    }).slice(0, HISTORY_MAX);
  }

  function pickPrompt(profile, uid) {
    var mbti = profile && profile.mbti ? String(profile.mbti).toUpperCase() : '';
    if (mbti && C.MBTI_PROMPTS && C.MBTI_PROMPTS[mbti]) return C.MBTI_PROMPTS[mbti];
    return pickFrom(C.GENERIC_PROMPTS || [], uid, 'prompt');
  }

  function pickChallenge(profile, uid) {
    var mbti = profile && profile.mbti ? String(profile.mbti).toUpperCase() : '';
    if (mbti && C.MBTI_CHALLENGES && C.MBTI_CHALLENGES[mbti]) return C.MBTI_CHALLENGES[mbti];
    return pickFrom(C.GENERIC_CHALLENGES || [], uid, 'challenge');
  }

  function pickTypeDayTip(profile, uid) {
    var mbti = profile && profile.mbti ? String(profile.mbti).toUpperCase() : '';
    var dow = new Date().getDay();
    var tips = C.MBTI_DAY_TIPS && C.MBTI_DAY_TIPS[mbti];
    if (tips && tips[dow]) return tips[dow];
    return pickFrom(
      ['Today: one priority before noon.', 'Today: one boundary stated kindly.'],
      uid,
      'typeDay'
    );
  }

  function pickSoloMoment(profile, uid) {
    var mbti = profile && profile.mbti ? String(profile.mbti).toUpperCase() : '';
    var pair = pickFrom(C.SOLO_MOMENTS || [], uid, 'solo') || { trap: 'autopilot', fix: 'one intentional pause' };
    return (
      'As ' +
      (mbti || 'your type') +
      ' today, watch for ' +
      pair.trap +
      ' — try ' +
      pair.fix +
      '.'
    );
  }

  function moodForDate(hist, date) {
    for (var i = 0; i < hist.length; i++) {
      if (hist[i].date === date) return hist[i].value;
    }
    return null;
  }

  function weekMoodSummary(hist) {
    var counts = { energized: 0, neutral: 0, drained: 0 };
    var total = 0;
    for (var i = 0; i < 7; i++) {
      var v = moodForDate(hist, dateKeyOffset(-i));
      if (v && counts[v] !== undefined) {
        counts[v]++;
        total++;
      }
    }
    if (total < 3) return null;
    var dominant = 'neutral';
    if (counts.energized >= counts.neutral && counts.energized >= counts.drained) dominant = 'energized';
    if (counts.drained > counts.energized && counts.drained >= counts.neutral) dominant = 'drained';
    var copy = C.WEEKLY_MOOD_INSIGHT && C.WEEKLY_MOOD_INSIGHT[dominant];
    var text = copy ? (total >= 5 ? copy.dominant : copy.mixed) : 'Your week has a mood pattern — keep logging to sharpen it.';
    return { total: total, counts: counts, dominant: dominant, text: text };
  }

  function lastWeekEcho(userData) {
    var hist = normalizeReflectionHistory(userData);
    var moods = normalizeMoodHistory(userData);
    var archive = normalizeArchive(userData);
    var targetStart = dateKeyOffset(-13);
    var targetEnd = dateKeyOffset(-6);
    var lines = [];

    var ref = hist.find(function (h) {
      return h.date >= targetStart && h.date <= targetEnd && h.note;
    });
    if (ref) {
      lines.push({
        kind: 'said',
        text: 'Last week you wrote: “' + truncate(ref.note, 120) + '”'
      });
    }

    var oldMood = moods.find(function (h) {
      return h.date >= targetStart && h.date <= targetEnd;
    });
    if (oldMood) {
      lines.push({
        kind: 'felt',
        text:
          'Last week you checked in feeling ' +
          (MOOD_LABEL[oldMood.value] || oldMood.value) +
          ' (' +
          oldMood.date +
          ').'
      });
    }

    var snap = archive.find(function (a) {
      return a.date >= targetStart && a.date <= targetEnd;
    });
    if (snap && snap.challenge) {
      lines.push({
        kind: 'wanted',
        text: 'Last week you wanted to: ' + truncate(snap.challenge, 100)
      });
    }
    if (snap && snap.moment && !ref) {
      lines.push({
        kind: 'focus',
        text: 'Last week’s focus: ' + truncate(snap.moment, 100)
      });
    }

    return lines;
  }

  function streakUnlockView(streakCount, userData) {
    var claimed = (userData && userData.streakUnlocks) || {};
    var milestones = [3, 7, 30];
    var unlocks = C.STREAK_UNLOCKS || {};
    for (var i = milestones.length - 1; i >= 0; i--) {
      var m = milestones[i];
      if (streakCount >= m && unlocks[m]) {
        return { milestone: m, claimed: !!claimed[String(m)], data: unlocks[m] };
      }
    }
    var next = milestones.find(function (m) {
      return streakCount < m;
    });
    return { next: next, count: streakCount };
  }

  function cardHtml(klass, label, bodyHtml, extraClass) {
    return (
      '<article class="daily-card ' +
      (klass || '') +
      ' ' +
      (extraClass || '') +
      '">' +
      '<div class="daily-card-label">' +
      escapeHTML(label) +
      '</div>' +
      '<div class="daily-card-body">' +
      bodyHtml +
      '</div></article>'
    );
  }

  function moodStripHtml(hist) {
    var cells = [];
    for (var i = 6; i >= 0; i--) {
      var dk = dateKeyOffset(-i);
      var v = moodForDate(hist, dk);
      var label = dk.slice(5);
      cells.push(
        '<div class="mood-strip-day' +
        (v ? ' has-' + v : '') +
        '" title="' +
        dk +
        (v ? ' — ' + v : '') +
        '">' +
        '<span class="mood-strip-dot"></span>' +
        '<span class="mood-strip-lbl">' +
        label +
        '</span></div>'
      );
    }
    return '<div class="mood-week-strip">' + cells.join('') + '</div>';
  }

  function fetchFriendContext(db, uid, userData) {
    var friends = ((userData && userData.friends) || []).filter(function (v, i, a) {
      return v && a.indexOf(v) === i;
    });
    if (!friends.length) return Promise.resolve(null);
    var fuid = friends[dayHash(uid, 'friend') % friends.length];
    return Promise.all([
      db.collection('users').doc(fuid).get(),
      db.collection('profiles').doc(fuid).get()
    ]).then(function (res) {
      var uDoc = res[0];
      var pDoc = res[1];
      if (!uDoc.exists) return null;
      var u = uDoc.data();
      var p = pDoc.exists && pDoc.data().latest ? pDoc.data().latest : {};
      return {
        uid: fuid,
        displayName: u.displayName || u.username || 'Friend',
        username: u.username,
        mbti: p.mbti || null
      };
    });
  }

  function archiveToday(db, uid, userData, profile) {
    var today = todayKey();
    var archive = normalizeArchive(userData);
    if (archive.some(function (a) {
      return a.date === today;
    })) {
      return Promise.resolve(userData);
    }
    var entry = {
      date: today,
      challenge: pickChallenge(profile, uid),
      moment: pickSoloMoment(profile, uid),
      typeDay: pickTypeDayTip(profile, uid)
    };
    archive.unshift(entry);
    archive = archive.slice(0, HISTORY_MAX);
    return db
      .collection('users')
      .doc(uid)
      .set({ dailyArchive: archive }, { merge: true })
      .then(function () {
        return Object.assign({}, userData, { dailyArchive: archive });
      });
  }

  function claimStreakUnlock(db, uid, milestone, userData) {
    var claimed = Object.assign({}, (userData && userData.streakUnlocks) || {});
    claimed[String(milestone)] = true;
    return db
      .collection('users')
      .doc(uid)
      .set({ streakUnlocks: claimed }, { merge: true })
      .then(function () {
        return Object.assign({}, userData, { streakUnlocks: claimed });
      });
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
        return Object.assign({}, userData || {}, {
          dailyStreak: { count: nextCount, lastDate: today }
        });
      });
  }

  function saveMood(db, uid, value, userData) {
    var today = todayKey();
    var hist = normalizeMoodHistory(userData).filter(function (h) {
      return h.date !== today;
    });
    hist.unshift({ date: today, value: value });
    hist = hist.slice(0, HISTORY_MAX);
    var hadToday = moodForDate(normalizeMoodHistory(userData), today);
    return db
      .collection('users')
      .doc(uid)
      .set({ dailyMood: { date: today, value: value }, moodHistory: hist }, { merge: true })
      .then(function () {
        var fresh = Object.assign({}, userData || {}, {
          dailyMood: { date: today, value: value },
          moodHistory: hist
        });
        if (!hadToday && g.AnimusXp) {
          return g.AnimusXp.awardXp(db, uid, 'mood_checkin').then(function () {
            return fresh;
          });
        }
        return fresh;
      });
  }

  function saveReflection(db, uid, note, userData, promptText) {
    var today = todayKey();
    note = String(note || '').trim().substring(0, 500);
    var hist = normalizeReflectionHistory(userData).filter(function (h) {
      return h.date !== today;
    });
    if (note) hist.unshift({ date: today, prompt: String(promptText || '').substring(0, 200), note: note });
    hist = hist.slice(0, HISTORY_MAX);
    var patch = { date: today, prompt: String(promptText || '').substring(0, 200), note: note };
    var hadNote =
      userData &&
      userData.dailyReflection &&
      userData.dailyReflection.date === today &&
      userData.dailyReflection.note;
    return db
      .collection('users')
      .doc(uid)
      .set({ dailyReflection: patch, reflectionHistory: hist }, { merge: true })
      .then(function () {
        var fresh = Object.assign({}, userData || {}, {
          dailyReflection: patch,
          reflectionHistory: hist
        });
        if (note && !hadNote && g.AnimusXp) {
          return g.AnimusXp.awardXp(db, uid, 'reflection_note').then(function () {
            return fresh;
          });
        }
        return fresh;
      });
  }

  function compareCardHtml(userData, friendCtx, profile) {
    var myMbti = profile && profile.mbti;
    if (friendCtx && friendCtx.mbti) {
      var lines = C.friendMomentLines(myMbti, friendCtx.mbti);
      var compareHref = friendCtx.username
        ? '/compare?u=' + encodeURIComponent(friendCtx.username)
        : '/compare?uid=' + encodeURIComponent(friendCtx.uid);
      return (
        '<p class="daily-card-lead">Today with <strong>' +
        escapeHTML(friendCtx.displayName) +
        '</strong> (' +
        escapeHTML(friendCtx.mbti) +
        ')</p>' +
        '<p class="daily-card-text"><span class="daily-card-tag">Watch</span> ' +
        escapeHTML(lines.friction) +
        '</p>' +
        '<p class="daily-card-text"><span class="daily-card-tag">Try</span> ' +
        escapeHTML(lines.win) +
        '</p>' +
        '<a href="' +
        compareHref +
        '" class="daily-row-cta">Compare now</a>'
      );
    }
    if (!g.AnimusEntitlements) return '';
    var left = g.AnimusEntitlements.getCompareRemaining(userData);
    if (g.AnimusEntitlements.hasAnimusPlus(userData)) {
      return (
        '<p class="daily-card-text">Plus member — unlimited compares. Add a friend for daily pair tips.</p>' +
        '<a href="/activity" class="daily-row-cta">Find friends</a>'
      );
    }
    if (left <= 0) {
      return (
        '<p class="daily-card-text">No free compares left this month.</p>' +
        '<a href="/shop" class="daily-row-cta">Get Plus</a>'
      );
    }
    return (
      '<p class="daily-card-text">' +
      left +
      ' compare' +
      (left === 1 ? '' : 's') +
      ' left — curious about someone?</p>' +
      '<div class="daily-card-actions">' +
      '<a href="/activity" class="daily-row-cta">Add a friend</a>' +
      '<a href="/compare" class="daily-row-cta daily-row-cta-secondary">Compare</a>' +
      '</div>'
    );
  }

  function maybeNotifyReminder() {
    try {
      if (!('Notification' in g) || Notification.permission !== 'granted') return;
      var key = 'animus_remind_last';
      var today = todayKey();
      if (localStorage.getItem(key) === today) return;
      var h = new Date().getHours();
      if (h < 8 || h > 11) return;
      new Notification('ANIMUS', {
        body: 'Your daily insight and Today cards are ready.',
        tag: 'animus-daily'
      });
      localStorage.setItem(key, today);
    } catch (e) {}
  }

  function reminderCardHtml() {
    var supported = 'Notification' in g;
    if (!supported) return '';
    var perm = Notification.permission;
    if (perm === 'granted') {
      return (
        '<p class="daily-card-text daily-card-text-muted">Daily browser reminders are on (morning visit).</p>'
      );
    }
    if (perm === 'denied') {
      return (
        '<p class="daily-card-text daily-card-text-muted">Notifications blocked — enable in browser settings for morning nudges.</p>'
      );
    }
    return '<button type="button" class="daily-row-cta" id="dailyRemindBtn">Enable morning reminder</button>';
  }

  function render(db, uid, userData, profile, onUserDataRefresh, friendCtx) {
    var mount = document.getElementById('homeDailyCards');
    if (!mount) mount = document.getElementById('homeDailyExtras');
    if (!mount) return;
    if (!profile || !profile.mbti) {
      mount.innerHTML = '';
      mount.hidden = true;
      return;
    }
    mount.hidden = false;

    var streak = (userData && userData.dailyStreak) || { count: 0, lastDate: null };
    var moodHist = normalizeMoodHistory(userData);
    var today = todayKey();
    var moodToday = moodForDate(moodHist, today);
    var promptText = pickPrompt(profile, uid);
    var challengeText = pickChallenge(profile, uid);
    var typeTip = pickTypeDayTip(profile, uid);
    var reflection = userData && userData.dailyReflection;
    var reflectionToday = reflection && reflection.date === today ? reflection.note : '';
    var weekSum = weekMoodSummary(moodHist);
    var echoes = lastWeekEcho(userData);
    var unlock = streakUnlockView(streak.count || 0, userData);
    var cards = [];

    if (friendCtx && friendCtx.mbti) {
      var fl = C.friendMomentLines(profile.mbti, friendCtx.mbti);
      cards.push(
        cardHtml(
          'daily-card--hero',
          'Today',
          '<p class="daily-card-lead">With <strong>' +
            escapeHTML(friendCtx.displayName) +
            '</strong> · ' +
            escapeHTML(friendCtx.mbti) +
            '</p>' +
            '<p class="daily-card-text">' +
            escapeHTML(fl.win) +
            '</p>',
          ''
        )
      );
    } else {
      cards.push(
        cardHtml(
          'daily-card--hero',
          'Today',
          '<p class="daily-card-text">' + escapeHTML(pickSoloMoment(profile, uid)) + '</p>',
          ''
        )
      );
    }

    if (echoes.length) {
      var echoBody = echoes
        .map(function (e) {
          return '<p class="daily-card-text daily-echo-line">' + escapeHTML(e.text) + '</p>';
        })
        .join('');
      cards.push(cardHtml('daily-card--echo', 'Last week', echoBody, ''));
    }

    var streakBody =
      '<div class="daily-streak-inline">' +
      '<span class="daily-streak-count">' +
      (streak.count || 0) +
      '</span>' +
      '<span class="daily-streak-unit">day streak</span>' +
      '</div>';
    if (unlock.data) {
      streakBody +=
        '<p class="daily-card-text"><strong>' +
        escapeHTML(unlock.data.title) +
        '</strong> — ' +
        escapeHTML(unlock.data.body) +
        '</p>';
      if (!unlock.claimed && unlock.milestone) {
        claimStreakUnlock(db, uid, unlock.milestone, userData).then(function (claimed) {
          if (onUserDataRefresh) onUserDataRefresh(claimed);
        });
      }
    } else if (unlock.next) {
      streakBody +=
        '<p class="daily-row-hint">' +
        (unlock.next - unlock.count) +
        ' day' +
        (unlock.next - unlock.count === 1 ? '' : 's') +
        ' until your next unlock (' +
        unlock.next +
        '-day milestone).</p>';
    }
    cards.push(cardHtml('daily-card--streak', 'Streak', streakBody, ''));

    var moodButtons = MOODS.map(function (m) {
      var active = moodToday === m.id ? ' is-active' : '';
      return (
        '<button type="button" class="mood-btn' +
        active +
        '" data-mood="' +
        m.id +
        '"><span class="mood-btn-icon">' +
        m.icon +
        '</span><span class="mood-btn-label">' +
        m.label +
        '</span></button>'
      );
    }).join('');
    cards.push(
      cardHtml(
        'daily-card--mood',
        'Mood',
        '<div class="mood-btn-group" role="group">' +
          moodButtons +
          '</div>' +
          moodStripHtml(moodHist) +
          '<p class="daily-row-hint">Tap today — fill the week to unlock your pattern.</p>',
        ''
      )
    );

    if (weekSum) {
      cards.push(
        cardHtml(
          'daily-card--weekly',
          'Your week',
          '<p class="daily-card-text">' + escapeHTML(weekSum.text) + '</p>' +
            '<p class="daily-row-hint">' +
            weekSum.total +
            ' check-ins · ' +
            weekSum.counts.energized +
            ' energized · ' +
            weekSum.counts.neutral +
            ' neutral · ' +
            weekSum.counts.drained +
            ' drained</p>',
          ''
        )
      );
    }

    cards.push(
      cardHtml(
        'daily-card--type',
        'Today as your type',
        '<p class="daily-card-text">' + escapeHTML(typeTip) + '</p>',
        ''
      )
    );

    cards.push(cardHtml('daily-card--compare', 'Compare', compareCardHtml(userData, friendCtx, profile), ''));

    cards.push(
      cardHtml(
        'daily-card--challenge',
        'Challenge',
        '<p class="daily-card-text">' + escapeHTML(challengeText) + '</p>',
        ''
      )
    );

    cards.push(
      cardHtml(
        'daily-card--reflection',
        'Reflection',
        '<p class="daily-prompt-text">' +
          escapeHTML(promptText) +
          '</p>' +
          '<textarea class="daily-reflection-input" id="dailyReflectionInput" rows="2" maxlength="500" placeholder="Optional — a sentence is enough">' +
          escapeHTML(reflectionToday) +
          '</textarea>' +
          '<button type="button" class="daily-reflection-save" id="dailyReflectionSave">Save</button>',
        ''
      )
    );

    var remindBody = reminderCardHtml();
    if (remindBody) {
      cards.push(cardHtml('daily-card--remind', 'Reminder', remindBody, ''));
    }

    mount.innerHTML = '<div class="home-daily-cards-stack">' + cards.join('') + '</div>';

    mount.querySelectorAll('.mood-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        saveMood(db, uid, btn.getAttribute('data-mood'), userData).then(function (fresh) {
          userData = fresh;
          if (onUserDataRefresh) onUserDataRefresh(fresh);
          render(db, uid, fresh, profile, onUserDataRefresh, friendCtx);
        });
      });
    });

    var saveBtn = document.getElementById('dailyReflectionSave');
    var input = document.getElementById('dailyReflectionInput');
    if (saveBtn && input) {
      saveBtn.addEventListener('click', function () {
        saveReflection(db, uid, input.value, userData, promptText).then(function (fresh) {
          if (onUserDataRefresh) onUserDataRefresh(fresh);
          if (typeof g.showToast === 'function') g.showToast('Reflection saved');
          render(db, uid, fresh, profile, onUserDataRefresh, friendCtx);
        });
      });
    }

    var remindBtn = document.getElementById('dailyRemindBtn');
    if (remindBtn) {
      remindBtn.addEventListener('click', function () {
        Notification.requestPermission().then(function (p) {
          if (p === 'granted' && typeof g.showToast === 'function') {
            g.showToast('Morning reminders enabled');
          }
          render(db, uid, userData, profile, onUserDataRefresh, friendCtx);
        });
      });
    }

    maybeNotifyReminder();
  }

  function refresh(db, uid, userData, profile, onUserDataRefresh) {
    return fetchFriendContext(db, uid, userData).then(function (friendCtx) {
      render(db, uid, userData, profile, onUserDataRefresh, friendCtx);
    });
  }

  function boot(db, uid, userData, profile, onUserDataRefresh) {
    if (!uid || !profile || !profile.mbti) return Promise.resolve(userData);
    return processStreak(db, uid, userData)
      .then(function (fresh) {
        return archiveToday(db, uid, fresh, profile);
      })
      .then(function (fresh) {
        return refresh(db, uid, fresh, profile, onUserDataRefresh).then(function () {
          return fresh;
        });
      });
  }

  g.AnimusDaily = {
    boot: boot,
    render: render,
    refresh: refresh,
    pickPrompt: pickPrompt,
    pickChallenge: pickChallenge
  };
})(typeof window !== 'undefined' ? window : globalThis);
