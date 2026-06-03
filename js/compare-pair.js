/* 1-on-1 compare: load targets, wire all panels, shared compat */
(function (g) {
  'use strict';

  var Compat = g.AnimusCompareCompat;
  var Normalize = g.AnimusCompareNormalize;
  var _cache = { my: null, them: null, myName: '', themName: '' };

  var escapeHTML = g.AnimusShared.escapeHTML;

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

  function clearCompatScoresOnly() {
    var pct = document.querySelector('.compat-pct');
    if (pct) pct.innerHTML = '—<span>%</span>';
    var fill = document.querySelector('.compat-fill');
    if (fill) { fill.setAttribute('data-w', '0'); fill.style.width = '0%'; }
    document.querySelectorAll('.ring-svg').forEach(function (svg) {
      var circles = svg.querySelectorAll('circle');
      if (circles[1]) circles[1].setAttribute('stroke-dashoffset', '138.16');
      var txt = svg.querySelector('text');
      if (txt) txt.textContent = '—';
      var scoreEl = svg.parentElement && svg.parentElement.querySelector('.ring-score');
      if (scoreEl) scoreEl.textContent = '—';
    });
  }

  function clearDemoCompat() {
    clearCompatScoresOnly();
    var verdict = document.getElementById('compatVerdict');
    if (verdict) verdict.textContent = 'Choose a friend above to compare';
  }

  function polBarPct(axis) {
    return Math.min(100, Math.max(0, Math.round(50 + (Number(axis) || 0))));
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
    if (panelPers) {
      var ennSec = panelPers.querySelectorAll('.dual-section')[0];
      if (ennSec) {
        var ennRows = ennSec.querySelectorAll('.dual-row');
        ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'].forEach(function (k, i) {
          setDualRowEl(
            ennRows[i],
            Math.round((my.enn && my.enn[k]) || 0),
            Math.round((them.enn && them.enn[k]) || 0)
          );
        });
      }
      var ivSec = panelPers.querySelectorAll('.dual-section')[1];
      if (ivSec) {
        var ivRows = ivSec.querySelectorAll('.dual-row');
        [['IV_SP', 0], ['IV_SOC', 1], ['IV_SX', 2]].forEach(function (pair) {
          setDualRowEl(
            ivRows[pair[1]],
            Math.round((my.iv && my.iv[pair[0]]) || 0),
            Math.round((them.iv && them.iv[pair[0]]) || 0)
          );
        });
      }
      var attSec = panelPers.querySelectorAll('.dual-section')[2];
      if (attSec) {
        var attRows = attSec.querySelectorAll('.dual-row');
        [['AT_AVO', 0], ['AT_SEC', 1], ['AT_ANX', 2], ['AT_DIS', 3]].forEach(function (pair) {
          if (!attRows[pair[1]]) return;
          setDualRowEl(
            attRows[pair[1]],
            Math.round((my.att2 && my.att2[pair[0]]) || 0),
            Math.round((them.att2 && them.att2[pair[0]]) || 0)
          );
        });
      }
    }

    var panelPhi = document.getElementById('c-panel-philosophy');
    if (panelPhi) {
      var phiKeys = ['PH_NIE', 'PH_EXI', 'PH_PRA', 'PH_STO'];
      var phiSec = panelPhi.querySelectorAll('.dual-section')[0];
      if (phiSec) {
        var phiRows = phiSec.querySelectorAll('.dual-row');
        phiKeys.forEach(function (k, i) {
          setDualRowEl(
            phiRows[i],
            Math.round((my.phiS && my.phiS[k]) || 0),
            Math.round((them.phiS && them.phiS[k]) || 0)
          );
        });
      }
      var ethSec = panelPhi.querySelectorAll('.dual-section')[1];
      if (ethSec) {
        var ethRows = ethSec.querySelectorAll('.dual-row');
        [['ET_EGO', 0], ['ET_CON', 1], ['ET_DEO', 2], ['ET_VIR', 3]].forEach(function (pair) {
          if (!ethRows[pair[1]]) return;
          setDualRowEl(
            ethRows[pair[1]],
            Math.round((my.eth && my.eth[pair[0]]) || 0),
            Math.round((them.eth && them.eth[pair[0]]) || 0)
          );
        });
      }
      if (typeof my.polX === 'number' || typeof them.polX === 'number') {
        var polSec = panelPhi.querySelectorAll('.dual-section')[2];
        if (polSec) {
          var polRows = polSec.querySelectorAll('.dual-row');
          setDualRowEl(polRows[0], polBarPct(my.polX), polBarPct(them.polX));
          setDualRowEl(polRows[1], polBarPct(my.polY), polBarPct(them.polY));
          var polNums = polRows[0] && polRows[0].querySelectorAll('.dual-num');
          if (polNums && polNums[0]) polNums[0].textContent = (my.polX > 0 ? '+' : '') + Math.round(my.polX);
          if (polNums && polNums[1]) polNums[1].textContent = (them.polX > 0 ? '+' : '') + Math.round(them.polX);
          polNums = polRows[1] && polRows[1].querySelectorAll('.dual-num');
          if (polNums && polNums[0]) polNums[0].textContent = (my.polY > 0 ? '+' : '') + Math.round(my.polY || 0);
          if (polNums && polNums[1]) polNums[1].textContent = (them.polY > 0 ? '+' : '') + Math.round(them.polY || 0);
        }
      }
    }
  }

  function renderAnalysisHtml(ai, note) {
    var html =
      '<div class="ai-section"><div class="ai-section-title">Where You Align</div><div class="ai-block"><div class="ai-block-text">' +
      escapeHTML(ai.whereAlign) +
      '</div></div></div>' +
      '<div class="ai-section"><div class="ai-section-title">Where You\'ll Clash</div><div class="ai-block"><div class="ai-block-text">' +
      escapeHTML(ai.whereClash) +
      '</div></div></div>' +
      '<div class="ai-section"><div class="ai-section-title">How You\'d Interact</div><div class="ai-block"><div class="ai-block-text">' +
      escapeHTML(ai.dynamic) +
      '</div></div></div>' +
      '<div class="ai-section"><div class="ai-section-title">What Each Brings Out</div><div class="ai-block"><div class="ai-block-text">' +
      escapeHTML(ai.mutualEffect) +
      '</div></div></div>';
    if (note) {
      html =
        '<p class="compare-ai-note">' +
        escapeHTML(note) +
        '</p>' +
        html;
    }
    return html;
  }

  function runCompareAnalysis(mySnap, themSnap, myName, themName, scores) {
    var aiContent = document.getElementById('aiAnalysisContent');
    if (!aiContent) return;

    function parseAnalysisPayload(text) {
      if (!text) return null;
      var cleaned = text.replace(/```json|```/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        var match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch (e2) {
            return null;
          }
        }
      }
      return null;
    }

    function showOffline(note) {
      var ai =
        Normalize && Normalize.buildOfflineAnalysis
          ? Normalize.buildOfflineAnalysis(mySnap, themSnap, myName, themName, scores)
          : {
              whereAlign: 'Your types suggest overlapping values with distinct blind spots.',
              whereClash: 'Stress may highlight different priorities in planning vs. emotional tone.',
              dynamic: 'Clear roles and recovery time after hard talks keep the dynamic constructive.',
              mutualEffect: 'Each person can stretch the other outside their default comfort zone.'
            };
      aiContent.innerHTML = renderAnalysisHtml(ai, note);
    }

    showOffline(null);

    var prompt =
      'You are an expert in MBTI and Enneagram. Analyze compatibility between two people.' +
      ' Person 1 (' +
      myName +
      '): MBTI=' +
      mySnap.mbti +
      ', Enneagram=' +
      (mySnap.ennType || '?') +
      'w' +
      (mySnap.ennWing || '?') +
      ', Attachment=' +
      (mySnap.att || '?') +
      ', Philosophy=' +
      (mySnap.phi || '?') +
      ', Political X=' +
      (mySnap.polX || 0) +
      ' Y=' +
      (mySnap.polY || 0) +
      '.' +
      ' Person 2 (' +
      themName +
      '): MBTI=' +
      themSnap.mbti +
      ', Enneagram=' +
      (themSnap.ennType || '?') +
      'w' +
      (themSnap.ennWing || '?') +
      ', Attachment=' +
      (themSnap.att || '?') +
      ', Philosophy=' +
      (themSnap.phi || '?') +
      ', Political X=' +
      (themSnap.polX || 0) +
      ' Y=' +
      (themSnap.polY || 0) +
      '.' +
      ' Return JSON with keys: {"whereAlign":"2 paragraphs on natural connection","whereClash":"2 paragraphs on friction","dynamic":"1 paragraph on social interaction","mutualEffect":"1 paragraph on what each brings out in the other"}. Raw JSON only.';

    var compareFetch =
      typeof AnimusShared !== 'undefined' && AnimusShared.fetchApiPost
        ? AnimusShared.fetchApiPost('/api/compare', { prompt: prompt })
        : Promise.reject(new Error('auth_required'));

    compareFetch
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (d) {
        var text = (d.content || [])
          .map(function (b) {
            return b.type === 'text' ? b.text : '';
          })
          .join('')
          .trim();
        var ai = parseAnalysisPayload(text);
        if (ai && ai.whereAlign) {
          aiContent.innerHTML = renderAnalysisHtml(ai, null);
        }
      })
      .catch(function () {
        /* offline analysis already visible */
      });
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

  function setScoresVisible(show) {
    var wrap = document.getElementById('compareScoreBlock');
    if (wrap) wrap.classList.toggle('is-hidden', !show);
    if (!show) clearCompatScoresOnly();
  }

  function showDerivedNotice(my, them) {
    var el = document.getElementById('compareDataNotice');
    if (!el) return;
    var derived =
      (my && my._compareDerivedCog) || (them && them._compareDerivedCog);
    if (derived) {
      el.textContent =
        'Charts use type-based estimates where full test scores are missing. Overall % only appears when both people have completed the full assessment.';
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  function generateComparison(mySnap, themSnap, myName, themName) {
    if (!Compat) return;
    mySnap =
      Normalize && Normalize.normalizeProfileForCompare
        ? Normalize.normalizeProfileForCompare(mySnap)
        : mySnap;
    themSnap =
      Normalize && Normalize.normalizeProfileForCompare
        ? Normalize.normalizeProfileForCompare(themSnap)
        : themSnap;
    if (!mySnap || !themSnap || !mySnap.mbti || !themSnap.mbti) {
      clearDemoCompat();
      return;
    }

    _cache.my = mySnap;
    _cache.them = themSnap;
    _cache.myName = myName;
    _cache.themName = themName;

    showDerivedNotice(mySnap, themSnap);
    updateDualBars(mySnap, themSnap);
    updateSummaryTable(mySnap, themSnap, myName, themName);

    var showScore =
      Normalize && Normalize.canShowCompatScore
        ? Normalize.canShowCompatScore(mySnap, themSnap)
        : Compat.hasCogData && Compat.hasCogData(mySnap) && Compat.hasCogData(themSnap);

    setScoresVisible(showScore);

    var scores = null;
    if (showScore) {
      scores = Compat.calcOverall(mySnap, themSnap);
    }

    if (scores) {
      var pct = document.querySelector('.compat-pct');
      if (pct) pct.innerHTML = scores.overall + '<span>%</span>';
      var fill = document.querySelector('.compat-fill');
      if (fill) {
        fill.setAttribute('data-w', scores.overall);
        setTimeout(function () { fill.style.width = scores.overall + '%'; }, 200);
      }
      applyRings(scores);
      var verdict =
        scores.overall >= 75
          ? 'High alignment across most dimensions'
          : scores.overall >= 55
            ? 'Significant overlap with meaningful differences'
            : scores.overall >= 40
              ? 'Complementary differences — room to grow together'
              : 'Strong contrasts — challenging but stimulating';
      var verdictEl = document.getElementById('compatVerdict');
      if (verdictEl) verdictEl.textContent = verdict;
    } else {
      var verdictEl2 = document.getElementById('compatVerdict');
      if (verdictEl2) {
        verdictEl2.textContent =
          'Select a friend with full assessment data to see an overall compatibility score.';
      }
    }

    runCompareAnalysis(mySnap, themSnap, myName, themName, scores || {});

    if (typeof g.animateCompareBars === 'function') {
      g.animateCompareBars(document.getElementById('comparePanels'));
    }
  }

  function refreshCharts() {
    if (_cache.my && _cache.them) {
      updateDualBars(_cache.my, _cache.them);
      if (typeof g.animateCompareBars === 'function') {
        var active = document.querySelector('.c-panel.active');
        g.animateCompareBars(active || document.getElementById('comparePanels'));
      }
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
      themUidPromise =
        g.AnimusShared && g.AnimusShared.resolveUsernameToUid
          ? g.AnimusShared.resolveUsernameToUid(db, u).catch(function () {
              return null;
            })
          : db
              .collection('usernames')
              .doc(u)
              .get()
              .then(function (doc) {
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
            ? '/' + encodeURIComponent(themUser.username)
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

        var myNorm =
          Normalize && Normalize.normalizeProfileForCompare
            ? Normalize.normalizeProfileForCompare(myProfile)
            : myProfile;
        var themNorm =
          Normalize && Normalize.normalizeProfileForCompare
            ? Normalize.normalizeProfileForCompare(themProfile)
            : themProfile;

        if (myProfile && themProfile) {
          if (g.AnimusEntitlements && !g.AnimusEntitlements.canCompare(myUser)) {
            setCompareResultsState('is-empty');
            clearDemoCompat();
            var verdict = document.getElementById('compatVerdict');
            if (verdict) {
              verdict.textContent =
                'You have used all ' +
                g.AnimusEntitlements.FREE_COMPARES_PER_MONTH +
                ' free compares this month. Get Animus Plus in the Shop for unlimited compares.';
            }
            return;
          }
          setCompareResultsState('is-ready');
          generateComparison(myProfile, themProfile, myName, themName);
          if (g.AnimusEntitlements) {
            g.AnimusEntitlements.recordCompareUsage(db, currentUser.uid, myUser);
          }
          if (g.AnimusXp) {
            g.AnimusXp.awardXp(db, currentUser.uid, 'compare');
          }
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
    updateDualBars: updateDualBars,
    refreshCharts: refreshCharts,
    runCompareAnalysis: runCompareAnalysis
  };
})(typeof window !== 'undefined' ? window : globalThis);
