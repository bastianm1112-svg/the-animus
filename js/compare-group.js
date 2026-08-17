/* Group compare — used on /compare?mode=group */
(function (g) {
  'use strict';

  var _people = {};
  var _selected = [];
  var _db = null;
  var _auth = null;
  var _userData = null;
  var _hasPlus = false;

  var escapeHTML = g.AnimusShared.escapeHTML;

  function showToast(m) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  function buildPerson(uid, u, snap, isYou) {
    return {
      uid: uid,
      displayName: u.displayName || 'Unknown',
      username: u.username || '',
      mbti: snap.mbti || '',
      mbtiName: snap.mbtiName || '',
      ennType: snap.ennType || '',
      ennWing: snap.ennWing || '',
      instStack: snap.instStack || '',
      phi: snap.phi || '',
      att: snap.att || '',
      cog: snap.cog || {},
      polX: snap.polX || 0,
      polY: snap.polY || 0,
      isYou: isYou
    };
  }

  function calcCompat(a, b) {
    if (!a.mbti || !b.mbti) return null;
    if (g.AnimusCompareCompat) {
      var scores = g.AnimusCompareCompat.calcOverall(
        { mbti: a.mbti, cog: a.cog, polX: a.polX, polY: a.polY, att: a.att, phi: a.phi },
        { mbti: b.mbti, cog: b.cog, polX: b.polX, polY: b.polY, att: b.att, phi: b.phi }
      );
      return scores ? scores.overall : null;
    }
    return 50;
  }

  function compatClass(n) {
    return n >= 75 ? 'compat-high' : n >= 55 ? 'compat-mid' : 'compat-low';
  }

  function renderPlusGate() {
    var grid = document.getElementById('selectorGrid');
    var hint = document.getElementById('selectorHint');
    var content = document.getElementById('groupContent');
    if (hint) hint.textContent = '';
    if (content) {
      content.innerHTML =
        '<div class="group-plus-gate">' +
        '<div class="group-plus-gate-title">Group compare is a Plus feature</div>' +
        '<p class="group-plus-gate-desc">Compare 2–6 friends at once with compatibility matrices and group insights. Unlimited 1-on-1 compares are still free (10/month).</p>' +
        '<a href="/shop" class="shop-open-link">Get Animus Plus</a>' +
        '</div>';
    }
    if (grid) {
      grid.innerHTML =
        '<div class="group-plus-gate" style="margin:0">' +
        '<div class="group-plus-gate-title">Animus Plus required</div>' +
        '<p class="group-plus-gate-desc">Unlock group compare on the Shop.</p>' +
        '<a href="/shop" class="shop-open-link">View Plus</a>' +
        '</div>';
    }
  }

  function renderSelector() {
    var grid = document.getElementById('selectorGrid');
    if (!grid) return;
    if (!_hasPlus) {
      renderPlusGate();
      return;
    }
    var allPeople = Object.values(_people).sort(function (a, b) {
      return a.isYou ? -1 : b.isYou ? 1 : 0;
    });
    if (!allPeople.length) {
      grid.innerHTML = '<div style="color:var(--muted);font-size:12px">Loading…</div>';
      return;
    }
    var hint = allPeople.length === 1
      ? '<div style="color:var(--muted);font-size:12px;margin-bottom:10px">Add friends on the <a href="/activity" style="color:var(--gold)">Activity</a> page, then select 2–6 people (including you).</div>'
      : '';
    grid.innerHTML = hint + allPeople.map(function (p) {
      var init = (p.displayName || '?').charAt(0).toUpperCase();
      var isSel = _selected.indexOf(p.uid) > -1;
      var cls = 'person-chip' + (p.isYou ? ' you' : '') + (isSel ? ' selected' : '');
      return '<div class="' + cls + '" data-uid="' + escapeHTML(p.uid) + '">'
        + '<div class="chip-avatar">' + init + '</div>'
        + '<div class="chip-info">'
        + '<div class="chip-name">' + escapeHTML(p.isYou ? 'You (' + p.displayName + ')' : p.displayName) + '</div>'
        + '<div class="chip-type">' + escapeHTML(p.mbti || 'No profile') + '</div>'
        + '</div>'
        + '<div class="chip-check">' + (isSel ? '&#10003;' : '') + '</div>'
        + '</div>';
    }).join('');
  }

  function togglePerson(uid) {
    if (!_hasPlus) {
      showToast('Group compare requires Animus Plus');
      return;
    }
    var max =
      g.AnimusEntitlements && g.AnimusEntitlements.PLUS_GROUP_MAX_PEOPLE
        ? g.AnimusEntitlements.PLUS_GROUP_MAX_PEOPLE
        : 6;
    var idx = _selected.indexOf(uid);
    if (idx > -1) _selected.splice(idx, 1);
    else {
      if (_selected.length >= max) {
        showToast('Max ' + max + ' people at once');
        return;
      }
      _selected.push(uid);
    }
    renderSelector();
    renderGroup();
  }

  function renderGroup() {
    var content = document.getElementById('groupContent');
    var hint = document.getElementById('selectorHint');
    if (!content || !hint) return;
    if (!_hasPlus) {
      renderPlusGate();
      return;
    }
    if (_selected.length < 2) {
      hint.textContent = _selected.length === 0
        ? 'Select 2–6 people to see group comparison'
        : 'Select at least one more person';
      content.innerHTML = '<div class="group-placeholder"><div class="group-placeholder-title">Pick people above</div><div>Choose 2–6 friends. You will get a live brief like 1-on-1: where you align, where you clash, and how the room actually runs.</div></div>';
      return;
    }
    hint.textContent = _selected.length + ' people selected';

    var people = _selected.map(function (uid) { return _people[uid]; }).filter(Boolean);
    var phiNames = {
      PH_STO: 'Stoic', PH_EPI: 'Epicurean', PH_KAN: 'Kantian', PH_ARI: 'Aristotelian',
      PH_NIE: 'Nietzschean', PH_EXI: 'Existentialist', PH_PRA: 'Pragmatist', PH_SKE: 'Skeptic'
    };

    var cardsHtml = '<div class="section-title">Profiles</div><div class="profiles-grid">'
      + people.map(function (p) {
        var init = (p.displayName || '?').charAt(0).toUpperCase();
        var ennStr = p.ennType && p.ennWing ? p.ennType + 'w' + p.ennWing : '';
        var phi = p.phi ? phiNames[p.phi] || p.phi : '';
        var detail = [ennStr, p.instStack, phi].filter(Boolean).join(' · ');
        return '<div class="profile-card' + (p.isYou ? ' is-you' : '') + '">'
          + (p.isYou ? '<div class="pc-you-badge">You</div>' : '')
          + '<div class="pc-avatar">' + init + '</div>'
          + '<div class="pc-name">' + escapeHTML(p.displayName) + '</div>'
          + '<div class="pc-username">' + (p.username ? '@' + escapeHTML(p.username) : '') + '</div>'
          + (p.mbti
            ? '<div class="pc-mbti">' + escapeHTML(p.mbti) + '</div><div class="pc-enn">' + escapeHTML(detail) + '</div>'
            : '<div class="pc-no-data">No profile yet</div>')
          + '</div>';
      }).join('')
      + '</div>';

    var matrixHtml = '';
    if (people.filter(function (p) { return p.mbti; }).length >= 2) {
      matrixHtml = '<div class="matrix-section"><div class="section-title">Compatibility Matrix</div>'
        + '<div class="matrix-wrap"><table class="matrix-table"><thead><tr><th></th>'
        + people.map(function (p) {
          return '<th>' + (p.isYou ? 'You' : escapeHTML(p.displayName.split(' ')[0]))
            + '<br><span style="color:var(--gold);font-family:var(--font-display),serif;font-size:14px">' + escapeHTML(p.mbti || '—') + '</span></th>';
        }).join('')
        + '</tr></thead><tbody>'
        + people.map(function (a) {
          return '<tr><td class="matrix-name">'
            + (a.isYou ? '<span style="color:var(--green)">You</span>' : escapeHTML(a.displayName.split(' ')[0]))
            + ' <span style="font-size:10px;color:var(--gold)">' + escapeHTML(a.mbti || '') + '</span></td>'
            + people.map(function (b) {
              if (a.uid === b.uid) return '<td class="self">—</td>';
              var score = calcCompat(a, b);
              if (score === null) return '<td style="color:var(--muted);font-size:11px">—</td>';
              return '<td><span class="matrix-pct ' + compatClass(score) + '">' + score + '</span><span style="font-size:10px;color:var(--muted)">%</span></td>';
            }).join('')
            + '</tr>';
        }).join('')
        + '</tbody></table></div></div>';
    }

    var mbtiCounts = {};
    var totalCompat = 0, compatPairs = 0;
    var avgPolX = 0, avgPolY = 0, polCount = 0;
    people.forEach(function (p) {
      if (p.mbti) mbtiCounts[p.mbti] = (mbtiCounts[p.mbti] || 0) + 1;
      avgPolX += p.polX;
      avgPolY += p.polY;
      polCount++;
    });
    for (var i = 0; i < people.length; i++) {
      for (var j = i + 1; j < people.length; j++) {
        var s = calcCompat(people[i], people[j]);
        if (s !== null) { totalCompat += s; compatPairs++; }
      }
    }
    var avgCompat = compatPairs ? Math.round(totalCompat / compatPairs) : null;
    avgPolX = polCount ? Math.round(avgPolX / polCount) : 0;
    avgPolY = polCount ? Math.round(avgPolY / polCount) : 0;
    var mostCommon = Object.keys(mbtiCounts).sort(function (a, b) {
      return mbtiCounts[b] - mbtiCounts[a];
    })[0] || '—';
    var eTypes = people.map(function (p) { return p.ennType; }).filter(Boolean);
    var mostEnn = eTypes.length ? eTypes.sort(function (a, b) {
      return eTypes.filter(function (x) { return x === b; }).length
        - eTypes.filter(function (x) { return x === a; }).length;
    })[0] : '—';
    var polLabel = avgPolX > 10 ? 'Right' : avgPolX < -10 ? 'Left' : 'Center';
    var authLabel = avgPolY > 10 ? 'Auth' : avgPolY < -10 ? 'Lib' : 'Moderate';

    var dyn = (g.AnimusGroupDynamics && g.AnimusGroupDynamics.analyze)
      ? g.AnimusGroupDynamics.analyze(people, {
          includeCultural: !!_hasPlus
        })
      : null;
    var insightsHtml = '<div class="c-panel compare-panel-card" id="groupAiPanel" style="margin-top:8px">' +
      '<div class="ai-section-title">Group analysis</div>' +
      '<p class="compare-ai-note">Live brief for this mix — same four beats as 1-on-1, plus a plain-language opener.</p>' +
      '<div id="groupAiContent"><div class="compare-ai-loading" role="status">Writing the group brief…</div></div>' +
      '</div>';
    if (dyn && g.AnimusResultsUI) {
      insightsHtml += g.AnimusResultsUI.groupDynamicCard(dyn);
    }
    if (dyn && dyn.clusters && dyn.clusters.length) {
      insightsHtml += '<div class="animus-card"><div class="animus-card-kicker">Subgroups</div><ul>' +
        dyn.clusters.map(function (c) {
          return '<li>' + escapeHTML(c.label) + ': ' + escapeHTML((c.members || []).join(', ')) + '</li>';
        }).join('') + '</ul><p class="animus-fine">' + escapeHTML(dyn.qualified) + '</p></div>';
    }

    content.innerHTML = cardsHtml + insightsHtml + matrixHtml;
    runGroupAnalysis(people, dyn, avgCompat);
  }

  function formatAiParagraphs(text) {
    if (!text) return '';
    return String(text).split(/\n\n+/).map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return '<p>' + escapeHTML(p) + '</p>'; }).join('');
  }

  function renderGroupAnalysisHtml(ai, note) {
    var html = '';
    if (ai.simpleTake) {
      html += '<p class="insight-simple">' + escapeHTML(ai.simpleTake) + '</p>';
    }
    html +=
      '<div class="ai-section"><div class="ai-section-title">Where You Align</div><div class="ai-block"><div class="ai-block-text">' + formatAiParagraphs(ai.whereAlign) + '</div></div></div>' +
      '<div class="ai-section"><div class="ai-section-title">Where You\'ll Clash</div><div class="ai-block"><div class="ai-block-text">' + formatAiParagraphs(ai.whereClash) + '</div></div></div>' +
      '<div class="ai-section"><div class="ai-section-title">How You\'d Interact</div><div class="ai-block"><div class="ai-block-text">' + formatAiParagraphs(ai.dynamic) + '</div></div></div>' +
      '<div class="ai-section"><div class="ai-section-title">What Each Brings Out</div><div class="ai-block"><div class="ai-block-text">' + formatAiParagraphs(ai.mutualEffect) + '</div></div></div>';
    if (note) html = '<p class="compare-ai-note">' + escapeHTML(note) + '</p>' + html;
    return html;
  }

  function runGroupAnalysis(people, dyn, avgCompat) {
    var el = document.getElementById('groupAiContent');
    if (!el) return;
    var Normalize = g.AnimusCompareNormalize;
    var meta = {
      avgCompat: avgCompat,
      closest: dyn && dyn.closestPair && (dyn.closestPair.names || []).join(' & '),
      contrast: dyn && dyn.contrastingPair && (dyn.contrastingPair.names || []).join(' & ')
    };
    function showOffline(note) {
      var ai = Normalize && Normalize.buildOfflineGroupAnalysis
        ? Normalize.buildOfflineGroupAnalysis(people, meta)
        : { whereAlign: 'This group shares overlapping types.', whereClash: 'Friction follows the widest matrix gaps.', dynamic: 'Roles will sort themselves under stress.', mutualEffect: 'Name functions instead of character.', simpleTake: 'In plain words: overlap is the glue; the matrix shows the weather.' };
      el.innerHTML = renderGroupAnalysisHtml(ai, note);
    }
    var prompt = Normalize && Normalize.buildGroupPrompt
      ? Normalize.buildGroupPrompt(people, meta)
      : 'Analyze this group. JSON keys whereAlign, whereClash, dynamic, mutualEffect.';
    if (!g.AnimusShared || !g.AnimusShared.fetchApiPost) {
      showOffline('Local brief — sign in for the live group analysis.');
      return;
    }
    g.AnimusShared.fetchApiPost('/api/compare', { prompt: prompt, mode: 'group' })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (d) {
        var text = (d.content || []).map(function (b) {
          return b.type === 'text' ? b.text : '';
        }).join('').trim();
        if (!text && d.whereAlign) {
          el.innerHTML = renderGroupAnalysisHtml(d);
          return;
        }
        var ai = null;
        try { ai = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch (e) {
          var m = text.match(/\{[\s\S]*\}/);
          if (m) { try { ai = JSON.parse(m[0]); } catch (e2) { ai = null; } }
        }
        if (!ai || !ai.whereAlign) {
          showOffline('Live response was incomplete — showing the local group brief.');
          return;
        }
        el.innerHTML = renderGroupAnalysisHtml(ai);
      })
      .catch(function () {
        showOffline('Live analysis unavailable right now. This is the local group brief.');
      });
  }

  function bindSelectorClicks() {
    var grid = document.getElementById('selectorGrid');
    if (!grid || grid._bound) return;
    grid._bound = true;
    grid.addEventListener('click', function (e) {
      var chip = e.target.closest('.person-chip');
      if (!chip) return;
      var uid = chip.getAttribute('data-uid');
      if (uid) togglePerson(uid);
    });
  }

  function init(db, auth) {
    _db = db;
    _auth = auth;
    bindSelectorClicks();
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        window.location.href =
          '/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      _people = {};
      _selected = [];

      function loadPeople() {
        _people[user.uid] = buildPerson(user.uid, {
          displayName: user.displayName || 'You',
          username: ''
        }, {}, true);
        if (!_selected.length) _selected.push(user.uid);
        renderSelector();

        Promise.all([
          _db.collection('users').doc(user.uid).get(),
          _db.collection('profiles').doc(user.uid).get()
        ]).then(function (res) {
          var uData = res[0].exists ? res[0].data() : {
            displayName: user.displayName || 'You',
            email: user.email || '',
            friends: []
          };
          _userData = uData;
          _hasPlus =
            g.AnimusEntitlements && g.AnimusEntitlements.canUseGroupCompare
              ? g.AnimusEntitlements.canUseGroupCompare(uData)
              : false;
          var snap = res[1].exists ? (res[1].data().latest || {}) : {};
          _people[user.uid] = buildPerson(user.uid, uData, snap, true);
          if (_selected.indexOf(user.uid) === -1) _selected.push(user.uid);

          var friends = (uData.friends || []).filter(function (v, i, a) {
            return v && v !== user.uid && a.indexOf(v) === i;
          });
          if (!friends.length) {
            renderSelector();
            renderGroup();
            return;
          }
          return Promise.all(friends.map(function (fuid) {
            return Promise.all([
              _db.collection('users').doc(fuid).get(),
              _db.collection('profiles').doc(fuid).get()
            ]).then(function (r2) {
              var fu = r2[0].exists ? r2[0].data() : { displayName: 'Friend' };
              var fs = r2[1].exists ? (r2[1].data().latest || {}) : {};
              _people[fuid] = buildPerson(fuid, fu, fs, false);
            });
          })).then(function () {
            renderSelector();
            renderGroup();
          });
        }).catch(function (err) {
          console.error('Group compare load error:', err);
          renderSelector();
          renderGroup();
        });
      }

      if (typeof AnimusCompareFriends !== 'undefined') {
        AnimusCompareFriends.ensureUserDocument(_db, user).then(loadPeople).catch(loadPeople);
      } else {
        loadPeople();
      }
    });
  }

  function setUserData(userData) {
    _userData = userData || {};
    _hasPlus =
      g.AnimusEntitlements && g.AnimusEntitlements.canUseGroupCompare
        ? g.AnimusEntitlements.canUseGroupCompare(_userData)
        : false;
    renderSelector();
    renderGroup();
  }

  function hasGroupAccess() {
    return _hasPlus;
  }

  g.AnimusCompareGroup = {
    init: init,
    setModeVisible: function () {
      renderSelector();
    },
    setUserData: setUserData,
    hasGroupAccess: hasGroupAccess
  };
})(typeof window !== 'undefined' ? window : globalThis);
