/* 1-on-1 compare: load targets, wire all panels, shared compat */
(function (g) {
  'use strict';

  var Compat = g.AnimusCompareCompat;

  function escapeHTML(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function setDualById(youId, themId, youNumId, themNumId, youVal, themVal) {
    var yb = document.getElementById(youId);
    var tb = document.getElementById(themId);
    if (yb) { yb.setAttribute('data-w', youVal); yb.style.width = youVal + '%'; }
    if (tb) { tb.setAttribute('data-w', themVal); tb.style.width = themVal + '%'; }
    if (youNumId) { var yn = document.getElementById(youNumId); if (yn) yn.textContent = youVal; }
    if (themNumId) { var tn = document.getElementById(themNumId); if (tn) tn.textContent = themVal; }
  }

  function setDualRow(panel, rowIndex, youVal, themVal) {
    var rows = panel.querySelectorAll('.dual-row');
    setDualRowEl(rows[rowIndex], youVal, themVal);
  }

  function setDualRowEl(row, youVal, themVal) {
    if (!row) return;
    var yb = row.querySelector('.dual-bar-you');
    var tb = row.querySelector('.dual-bar-them');
    var nums = row.querySelectorAll('.dual-num');
    if (yb) { yb.setAttribute('data-w', youVal); yb.style.width = youVal + '%'; }
    if (tb) { tb.setAttribute('data-w', themVal); tb.style.width = themVal + '%'; }
    if (nums[0]) nums[0].textContent = youVal;
    if (nums[1]) nums[1].textContent = themVal;
  }

  function clearDemoCompat() {
    var pct = document.querySelector('.compat-pct');
    if (pct) pct.innerHTML = '—<span>%</span>';
    var fill = document.querySelector('.compat-fill');
    if (fill) { fill.setAttribute('data-w', '0'); fill.style.width = '0%'; }
    var verdict = document.getElementById('compatVerdict');
    if (verdict) verdict.textContent = 'Choose a friend above to compare';
    document.querySelectorAll('.ring-svg').forEach(function (svg) {
      var circles = svg.querySelectorAll('circle');
      if (circles[1]) circles[1].setAttribute('stroke-dashoffset', '138.16');
      var txt = svg.querySelector('text');
      if (txt) txt.textContent = '—';
      var scoreEl = svg.parentElement && svg.parentElement.querySelector('.ring-score');
      if (scoreEl) scoreEl.textContent = '—';
    });
  }

  function updateDualBars(my, them) {
    var fns = ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'];
    fns.forEach(function (fn) {
      var yv = (my.cog && my.cog[fn] !== undefined) ? Math.round(my.cog[fn]) : 0;
      var tv = (them.cog && them.cog[fn] !== undefined) ? Math.round(them.cog[fn]) : 0;
      setDualById('cog-you-' + fn, 'cog-them-' + fn, 'cogn-you-' + fn, 'cogn-them-' + fn, yv, tv);
    });

    var b5keys = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
    var b5ids = ['O', 'C', 'E', 'A', 'N'];
    b5keys.forEach(function (k, i) {
      var id = b5ids[i];
      var yv = (my.big5 && my.big5[k] !== undefined) ? Math.round(my.big5[k]) : 0;
      var tv = (them.big5 && them.big5[k] !== undefined) ? Math.round(them.big5[k]) : 0;
      setDualById('b5-you-' + id, 'b5-them-' + id, 'b5n-you-' + id, 'b5n-them-' + id, yv, tv);
    });

    var panelPers = document.getElementById('c-panel-personality');
    if (panelPers && my.enn && them.enn) {
      var ennOrder = ['E1', 'E5', 'E6', 'E7'];
      var ennLabels = ['1', '5', '6', '7'];
      ennOrder.forEach(function (k, i) {
        setDualRow(panelPers, i, Math.round(my.enn[k] || 0), Math.round(them.enn[k] || 0));
      });
    }

    var panelPhi = document.getElementById('c-panel-philosophy');
    if (panelPhi && my.phiS && them.phiS) {
      var phiKeys = ['PH_NIE', 'PH_EXI', 'PH_PRA', 'PH_STO'];
      var phiSec = panelPhi.querySelectorAll('.dual-section')[0];
      if (phiSec) {
        var phiRows = phiSec.querySelectorAll('.dual-row');
        phiKeys.forEach(function (k, i) {
          setDualRowEl(phiRows[i], Math.round(my.phiS[k] || 0), Math.round(them.phiS[k] || 0));
        });
      }
      if (typeof my.polX === 'number' && typeof them.polX === 'number') {
        var polSec = panelPhi.querySelectorAll('.dual-section')[2];
        if (polSec) {
          var polRows = polSec.querySelectorAll('.dual-row');
          setDualRowEl(polRows[0], Math.min(100, Math.round(Math.abs(my.polX))), Math.min(100, Math.round(Math.abs(them.polX))));
          setDualRowEl(polRows[1], Math.min(100, Math.round(Math.abs(my.polY || 0))), Math.min(100, Math.round(Math.abs(them.polY || 0))));
        }
      }
    }
  }

  function gapClass(a, b) {
    if (!a || !b || a === '—' || b === '—') return 'med';
    if (a === b) return 'low';
    return 'high';
  }

  function updateSummaryTable(my, them, myName, themName) {
    var rows = [
      ['MBTI', my.mbti || '—', them.mbti || '—'],
      ['Enneagram', (my.ennType || '—') + 'w' + (my.ennWing || ''), (them.ennType || '—') + 'w' + (them.ennWing || '')],
      ['Tritype', my.ennTritype || '—', them.ennTritype || '—'],
      ['Attachment', (my.att || '—').replace('AT_', ''), (them.att || '—').replace('AT_', '')],
      ['Instinct', my.instStack || '—', them.instStack || '—'],
      ['Philosophy', (my.phi || '—').replace('PH_', ''), (them.phi || '—').replace('PH_', '')],
      ['Political', polShort(my), polShort(them)],
      ['Dominant Fn', topFn(my.cog), topFn(them.cog)],
      ['Socionics', my.socionics || '—', them.socionics || '—'],
      ['Temperament', topTmp(my.tmp), topTmp(them.tmp)]
    ];
    var tbody = document.querySelector('.summary-table tbody');
    if (!tbody) return;
    tbody.innerHTML = rows.map(function (r) {
      var gap = gapClass(r[1], r[2]);
      return '<tr><td class="dim-name">' + escapeHTML(r[0]) + '</td>' +
        '<td class="val-you">' + escapeHTML(r[1]) + '</td>' +
        '<td class="val-them">' + escapeHTML(r[2]) + '</td>' +
        '<td style="text-align:center"><span class="gap-pill gap-' + gap + '">' +
        gap.charAt(0).toUpperCase() + gap.slice(1) + '</span></td></tr>';
    }).join('');
    var hYou = document.getElementById('summaryYouHeader');
    var hThem = document.getElementById('summaryThemHeader');
    if (hYou) hYou.textContent = myName;
    if (hThem) hThem.textContent = themName;
  }

  function polShort(snap) {
    if (typeof snap.polX !== 'number') return '—';
    var econ = snap.polX > 10 ? 'Right' : snap.polX < -10 ? 'Left' : 'Center';
    var soc = snap.polY > 10 ? 'Auth' : snap.polY < -10 ? 'Lib' : 'Mod';
    return econ + '/' + soc;
  }

  function topFn(cog) {
    if (!cog) return '—';
    return Object.keys(cog).sort(function (a, b) { return cog[b] - cog[a]; })[0] || '—';
  }

  function topTmp(tmp) {
    if (!tmp) return '—';
    var k = Object.keys(tmp).sort(function (a, b) { return tmp[b] - tmp[a]; })[0];
    return k ? k.replace('TMP_', '') : '—';
  }

  function applyRings(scores) {
    var ringScores = [scores.cog, scores.blend, scores.phi, scores.pol, scores.att, scores.rapport];
    document.querySelectorAll('.ring-svg').forEach(function (svg, i) {
      var s = ringScores[i] || 0;
      var circumference = 138.16;
      var offset = circumference - (s / 100) * circumference;
      var circle = svg.querySelectorAll('circle')[1];
      if (circle) circle.setAttribute('stroke-dashoffset', offset.toFixed(2));
      var text = svg.querySelector('text');
      if (text) text.textContent = s + '%';
      var scoreEl = svg.parentElement && svg.parentElement.querySelector('.ring-score');
      if (scoreEl) scoreEl.textContent = s + '%';
    });
  }

  function generateComparison(mySnap, themSnap, myName, themName) {
    if (!Compat) return;
    var scores = Compat.calcOverall(mySnap, themSnap);
    if (!scores) return;

    var pct = document.querySelector('.compat-pct');
    if (pct) pct.innerHTML = scores.overall + '<span>%</span>';
    var fill = document.querySelector('.compat-fill');
    if (fill) {
      fill.setAttribute('data-w', scores.overall);
      setTimeout(function () { fill.style.width = scores.overall + '%'; }, 200);
    }

    applyRings(scores);

    var verdict = scores.overall >= 75 ? 'High alignment across most dimensions' :
      scores.overall >= 55 ? 'Significant overlap with meaningful differences' :
        scores.overall >= 40 ? 'Complementary differences — room to grow together' :
          'Strong contrasts — challenging but stimulating';
    var verdictEl = document.getElementById('compatVerdict');
    if (verdictEl) verdictEl.textContent = verdict;

    updateDualBars(mySnap, themSnap);
    updateSummaryTable(mySnap, themSnap, myName, themName);

    if (typeof g.generateAIAnalysis === 'function') {
      g.generateAIAnalysis(mySnap, themSnap, myName, themName);
    }
  }

  function setCompareResultsState(state) {
    var wrap = document.getElementById('compareResultsWrap');
    if (!wrap) return;
    wrap.classList.remove('is-empty', 'is-ready', 'is-pending');
    if (state) wrap.classList.add(state);
  }

  function loadComparisonTarget(db, auth, currentUser, params) {
    var u = params.get('u');
    var uidParam = params.get('uid');

    if (!u && !uidParam) {
      clearDemoCompat();
      setCompareResultsState('is-empty');
      return;
    }
    setCompareResultsState('is-pending');

    var themUidPromise;
    if (uidParam) {
      themUidPromise = Promise.resolve(uidParam.replace(/[^a-zA-Z0-9]/g, '').substring(0, 128));
    } else {
      u = u.replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 32);
      themUidPromise = db.collection('usernames').doc(u).get().then(function (doc) {
        if (!doc.exists) return null;
        return doc.data().uid;
      });
    }

    themUidPromise.then(function (themUid) {
      if (!themUid) {
        var tn = document.getElementById('themName');
        if (tn) tn.textContent = 'User not found';
        return;
      }

      var myProfileP =
        g.AnimusShared && g.AnimusShared.fetchLatestProfile
          ? g.AnimusShared.fetchLatestProfile(currentUser.uid)
          : db
              .collection('profiles')
              .doc(currentUser.uid)
              .get()
              .then(function (d) {
                return d.exists && d.data().latest ? d.data().latest : null;
              });
      var themProfileP =
        g.AnimusShared && g.AnimusShared.fetchLatestProfile
          ? g.AnimusShared.fetchLatestProfile(themUid, { allowLocalFallback: false })
          : db
              .collection('profiles')
              .doc(themUid)
              .get()
              .then(function (d) {
                return d.exists && d.data().latest ? d.data().latest : null;
              });

      Promise.all([
        myProfileP,
        db.collection('users').doc(currentUser.uid).get(),
        themProfileP,
        db.collection('users').doc(themUid).get()
      ]).then(function (results) {
        var myProfile = results[0];
        var myUser = results[1].exists ? results[1].data() : {};
        var themProfile = results[2];
        var themUser = results[3].exists ? results[3].data() : {};

        var myName = escapeHTML(myUser.displayName || currentUser.displayName || 'You');
        var themName = escapeHTML(themUser.displayName || themUser.username || 'Them');

        document.getElementById('youName').textContent = myName;
        document.getElementById('youUsername').textContent = '@' + escapeHTML(myUser.username || '');
        if (myProfile) {
          document.getElementById('youType').textContent = myProfile.mbti || '—';
          document.getElementById('youEnn').textContent =
            (myProfile.ennType || '—') + 'w' + (myProfile.ennWing || '') +
            (myProfile.instStack ? ' · ' + myProfile.instStack : '');
        }

        document.getElementById('themName').textContent = themName;
        document.getElementById('themUsername').textContent = '@' + escapeHTML(themUser.username || '—');
        document.getElementById('themAvatar').textContent = themName.charAt(0).toUpperCase();

        if (g.AnimusShared) {
          g.AnimusShared.applyNavAvatarForSession(document.getElementById('navAvatar'), currentUser);
          g.AnimusShared.applyProfilePhoto(document.getElementById('youAvatar'), currentUser, myUser);
          g.AnimusShared.applyProfilePhoto(document.getElementById('themAvatar'), { uid: themUid }, themUser);
        }

        var themProfileUrl = g.AnimusShared
          ? g.AnimusShared.profileHrefForUser(themUser.username, themUid)
          : (themUser.username
            ? '/profile?u=' + encodeURIComponent(themUser.username)
            : '/profile?uid=' + encodeURIComponent(themUid));
        var viewBtn = document.getElementById('viewThemBtn');
        if (viewBtn) {
          viewBtn.href = themProfileUrl;
          viewBtn.textContent = 'View ' + themName + "'s Profile →";
        }

        ['legendYouAI', 'legendYouCog', 'legendYou', 'legendYou2', 'legendYouPhi'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.textContent = myName;
        });
        ['legendThemAI', 'legendThemCog', 'legendThem', 'legendThem2', 'legendThemPhi'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.textContent = themName;
        });

        if (themProfile) {
          document.getElementById('themType').textContent = themProfile.mbti || '—';
          document.getElementById('themEnn').textContent =
            (themProfile.ennType || '—') + 'w' + (themProfile.ennWing || '') +
            (themProfile.instStack ? ' · ' + themProfile.instStack : '');
        }

        if (myProfile && themProfile) {
          setCompareResultsState('is-ready');
          generateComparison(myProfile, themProfile, myName, themName);
          if (typeof g.animateCompareBars === 'function') g.animateCompareBars();
        } else {
          setCompareResultsState('is-pending');
          clearDemoCompat();
          if (!myProfile) {
            var v = document.getElementById('compatVerdict');
            if (v) v.textContent = 'Complete your assessment to compare scores';
          } else if (!themProfile) {
            var v2 = document.getElementById('compatVerdict');
            if (v2) v2.textContent = themName + ' has not completed the assessment yet';
          }
        }
      }).catch(function (e) {
        console.error('Compare load error:', e);
      });
    });
  }

  function initPairCompare(db, auth) {
    auth.onAuthStateChanged(function (currentUser) {
      if (!currentUser) {
        window.location.href = '/login';
        return;
      }

      var params = new URLSearchParams(window.location.search);
      var u = params.get('u');
      var uidParam = params.get('uid');
      var selectedPicker = u || (uidParam ? ('uid:' + uidParam) : '');

      if (g.AnimusCompareFriends) {
        g.AnimusCompareFriends.fetchFriends(db, currentUser).then(function (friends) {
          var chips = document.getElementById('compareFriendChips');
          var empty = document.getElementById('friendsPickerEmpty');
          if (!friends.length) {
            if (chips) chips.innerHTML = '';
            if (empty) {
              empty.style.display = 'block';
              empty.innerHTML =
                'No friends yet. <a href="/friends">Add friends</a>, then pick someone to compare.';
            }
          } else {
            if (empty) empty.style.display = 'none';
            g.AnimusCompareFriends.renderComparePicker(chips, friends, selectedPicker);
          }
        });
      }

      loadComparisonTarget(db, auth, currentUser, params);
    });
  }

  g.AnimusComparePair = {
    init: initPairCompare,
    generateComparison: generateComparison,
    clearDemoCompat: clearDemoCompat,
    updateDualBars: updateDualBars
  };
})(typeof window !== 'undefined' ? window : globalThis);
