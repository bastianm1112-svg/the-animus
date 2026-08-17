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

    var strip = '<div class="profiles-strip group-strip">' + people.map(function (p) {
      var init = (p.displayName || '?').charAt(0).toUpperCase();
      var ennStr = p.ennType && p.ennWing ? p.ennType + 'w' + p.ennWing : '';
      return '<div class="profile-half">'
        + '<div class="ph-avatar">' + init + '</div>'
        + '<div class="ph-info">'
        + '<div class="ph-name">' + escapeHTML(p.isYou ? 'You' : p.displayName) + '</div>'
        + '<div class="ph-type">' + escapeHTML(p.mbti || '—') + '</div>'
        + '<div class="ph-enn">' + escapeHTML(ennStr || (p.username ? '@' + p.username : '')) + '</div>'
        + '</div></div>';
    }).join('') + '</div>';

    var mbtiCounts = {};
    var totalCompat = 0, compatPairs = 0;
    people.forEach(function (p) {
      if (p.mbti) mbtiCounts[p.mbti] = (mbtiCounts[p.mbti] || 0) + 1;
    });
    for (var i = 0; i < people.length; i++) {
      for (var j = i + 1; j < people.length; j++) {
        var s = calcCompat(people[i], people[j]);
        if (s !== null) { totalCompat += s; compatPairs++; }
      }
    }
    var avgCompat = compatPairs ? Math.round(totalCompat / compatPairs) : null;
    var mostCommon = Object.keys(mbtiCounts).sort(function (a, b) {
      return mbtiCounts[b] - mbtiCounts[a];
    })[0] || '—';

    var dyn = (g.AnimusGroupDynamics && g.AnimusGroupDynamics.analyze)
      ? g.AnimusGroupDynamics.analyze(people, { includeCultural: !!_hasPlus })
      : null;

    var verdict = avgCompat == null
      ? 'Need completed tests on both sides of each pair.'
      : avgCompat >= 70 ? 'This room overlaps a lot — friction will still show up in the brief.'
        : avgCompat >= 50 ? 'Enough overlap to work; the brief names where it will snag.'
          : 'This is a contrast room — useful if roles stay explicit.';

    var scoreHtml = '<div class="compat-bar-wrap">'
      + '<div class="compat-label">Room compatibility</div>'
      + '<div class="compat-score-row">'
      + '<div class="compat-pct">' + (avgCompat != null ? avgCompat : '—') + '<span>%</span></div>'
      + '<div class="compat-track"><div class="compat-fill" style="width:' + (avgCompat || 0) + '%"></div></div>'
      + '<div class="compat-verdict">' + escapeHTML(verdict) + '</div>'
      + '</div></div>';

    var glance = '<div class="group-glance">'
      + '<div class="group-glance-item"><span>Common type</span><strong>' + escapeHTML(mostCommon) + '</strong></div>'
      + '<div class="group-glance-item"><span>Closest</span><strong>' + escapeHTML(dyn && dyn.closestPair ? (dyn.closestPair.names || []).join(' & ') : '—') + '</strong></div>'
      + '<div class="group-glance-item"><span>Most contrast</span><strong>' + escapeHTML(dyn && dyn.contrastingPair ? (dyn.contrastingPair.names || []).join(' & ') : '—') + '</strong></div>'
      + '</div>';

    var matrixHtml = '';
    if (people.filter(function (p) { return p.mbti; }).length >= 2) {
      matrixHtml = '<div class="matrix-wrap"><table class="matrix-table"><thead><tr><th></th>'
        + people.map(function (p) {
          return '<th>' + (p.isYou ? 'You' : escapeHTML(p.displayName.split(' ')[0]))
            + '<br><span class="matrix-type">' + escapeHTML(p.mbti || '—') + '</span></th>';
        }).join('')
        + '</tr></thead><tbody>'
        + people.map(function (a) {
          return '<tr><td class="matrix-name">'
            + (a.isYou ? 'You' : escapeHTML(a.displayName.split(' ')[0]))
            + '</td>'
            + people.map(function (b) {
              if (a.uid === b.uid) return '<td class="self">—</td>';
              var score = calcCompat(a, b);
              if (score === null) return '<td>—</td>';
              return '<td><span class="matrix-pct ' + compatClass(score) + '">' + score + '</span>%</td>';
            }).join('')
            + '</tr>';
        }).join('')
        + '</tbody></table></div>';
    }

    var roomHtml = (dyn && g.AnimusResultsUI ? g.AnimusResultsUI.groupDynamicCard(dyn) : '')
      + (dyn && dyn.clusters && dyn.clusters.length
        ? '<div class="animus-card" style="margin-top:12px"><div class="animus-card-kicker">Subgroups</div><ul>' +
          dyn.clusters.map(function (c) {
            return '<li>' + escapeHTML(c.label) + ': ' + escapeHTML((c.members || []).join(', ')) + '</li>';
          }).join('') + '</ul></div>'
        : '');

    content.innerHTML =
      '<div class="compare-hero group-hero">' + strip + scoreHtml + glance + '</div>' +
      '<div class="compare-tabs-wrap"><div class="compare-tabs" role="tablist">' +
      '<button type="button" class="compare-tab active" data-group-panel="ai"><span class="compare-tab-text"><span class="compare-tab-label">AI</span><span class="compare-tab-desc">Insight</span></span></button>' +
      '<button type="button" class="compare-tab" data-group-panel="room"><span class="compare-tab-text"><span class="compare-tab-label">Room</span><span class="compare-tab-desc">Dynamics</span></span></button>' +
      '<button type="button" class="compare-tab" data-group-panel="grid"><span class="compare-tab-text"><span class="compare-tab-label">Pairs</span><span class="compare-tab-desc">Matrix</span></span></button>' +
      '</div></div>' +
      '<div class="c-panel compare-panel-card active" data-group-pane="ai">' +
      '<div class="compare-panel-head"><h2 class="compare-panel-title">AI Analysis</h2>' +
      '<p class="compare-panel-sub">How this mix actually runs — same beats as 1-on-1.</p></div>' +
      '<div id="groupAiContent"><div class="compare-ai-loading" role="status">Writing the group brief…</div></div></div>' +
      '<div class="c-panel compare-panel-card" data-group-pane="room">' +
      '<div class="compare-panel-head"><h2 class="compare-panel-title">The room</h2>' +
      '<p class="compare-panel-sub">Who sits near whom, and who is the weather system.</p></div>' +
      (roomHtml || '<p class="compare-panel-empty">Need two completed profiles.</p>') + '</div>' +
      '<div class="c-panel compare-panel-card" data-group-pane="grid">' +
      '<div class="compare-panel-head"><h2 class="compare-panel-title">Every pair</h2>' +
      '<p class="compare-panel-sub">Same scoring as 1-on-1, for each pairing in the room.</p></div>' +
      (matrixHtml || '<p class="compare-panel-empty">Need two completed tests.</p>') + '</div>';

    content.querySelectorAll('[data-group-panel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-group-panel');
        content.querySelectorAll('[data-group-panel]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        content.querySelectorAll('[data-group-pane]').forEach(function (pane) {
          pane.classList.toggle('active', pane.getAttribute('data-group-pane') === id);
        });
      });
    });

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
