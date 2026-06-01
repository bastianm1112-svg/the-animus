/* Group compare — used on /compare?mode=group */
(function (g) {
  'use strict';

  var _people = {};
  var _selected = [];
  var _db = null;
  var _auth = null;

  function escapeHTML(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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

  function calcCogCompat(a, b) {
    var fns = ['Ti', 'Te', 'Fi', 'Fe', 'Ni', 'Ne', 'Si', 'Se'];
    var aV = fns.map(function (f) { return a[f] || 0; });
    var bV = fns.map(function (f) { return b[f] || 0; });
    var dot = 0, mA = 0, mB = 0;
    for (var i = 0; i < fns.length; i++) {
      dot += aV[i] * bV[i];
      mA += aV[i] * aV[i];
      mB += bV[i] * bV[i];
    }
    var sim = mA && mB ? dot / (Math.sqrt(mA) * Math.sqrt(mB)) : 0;
    var aSorted = fns.slice().sort(function (x, y) { return (a[y] || 0) - (a[x] || 0); });
    var bSorted = fns.slice().sort(function (x, y) { return (b[y] || 0) - (b[x] || 0); });
    var golden = [[0, 1], [1, 0], [2, 3], [3, 2], [4, 5], [5, 4]];
    var complementBonus = golden.reduce(function (s, pair) {
      return s + (aSorted[pair[0]] === bSorted[pair[1]] ? 8 : 0);
    }, 0);
    return Math.min(100, Math.round(sim * 60 + complementBonus));
  }

  function calcPolCompat(x1, y1, x2, y2) {
    var d = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    return Math.max(0, Math.round(100 - d * 0.7));
  }

  function calcAttCompat(a, b) {
    var m = {
      AT_SEC: { AT_SEC: 90, AT_ANX: 72, AT_AVO: 65, AT_DIS: 60 },
      AT_ANX: { AT_SEC: 72, AT_ANX: 45, AT_AVO: 30, AT_DIS: 35 },
      AT_AVO: { AT_SEC: 65, AT_ANX: 30, AT_AVO: 55, AT_DIS: 70 },
      AT_DIS: { AT_SEC: 60, AT_ANX: 35, AT_AVO: 70, AT_DIS: 50 }
    };
    return (m[a] && m[a][b]) || 50;
  }

  function calcPhiCompat(a, b) {
    var m = {
      PH_STO: { PH_STO: 90, PH_EPI: 55, PH_KAN: 80, PH_ARI: 75, PH_NIE: 60, PH_EXI: 65, PH_PRA: 70, PH_SKE: 72 },
      PH_EPI: { PH_STO: 55, PH_EPI: 90, PH_KAN: 50, PH_ARI: 70, PH_NIE: 65, PH_EXI: 75, PH_PRA: 80, PH_SKE: 60 },
      PH_KAN: { PH_STO: 80, PH_EPI: 50, PH_KAN: 90, PH_ARI: 72, PH_NIE: 45, PH_EXI: 55, PH_PRA: 60, PH_SKE: 65 },
      PH_ARI: { PH_STO: 75, PH_EPI: 70, PH_KAN: 72, PH_ARI: 90, PH_NIE: 58, PH_EXI: 60, PH_PRA: 78, PH_SKE: 65 },
      PH_NIE: { PH_STO: 60, PH_EPI: 65, PH_KAN: 45, PH_ARI: 58, PH_NIE: 90, PH_EXI: 82, PH_PRA: 55, PH_SKE: 70 },
      PH_EXI: { PH_STO: 65, PH_EPI: 75, PH_KAN: 55, PH_ARI: 60, PH_NIE: 82, PH_EXI: 90, PH_PRA: 60, PH_SKE: 75 },
      PH_PRA: { PH_STO: 70, PH_EPI: 80, PH_KAN: 60, PH_ARI: 78, PH_NIE: 55, PH_EXI: 60, PH_PRA: 90, PH_SKE: 68 },
      PH_SKE: { PH_STO: 72, PH_EPI: 60, PH_KAN: 65, PH_ARI: 65, PH_NIE: 70, PH_EXI: 75, PH_PRA: 68, PH_SKE: 90 }
    };
    return (m[a] && m[a][b]) || 55;
  }

  function calcCompat(a, b) {
    if (!a.mbti || !b.mbti) return null;
    var cog = calcCogCompat(a.cog, b.cog);
    var pol = calcPolCompat(a.polX, a.polY, b.polX, b.polY);
    var att = calcAttCompat(a.att, b.att);
    var phi = calcPhiCompat(a.phi, b.phi);
    return Math.round(cog * 0.35 + pol * 0.2 + att * 0.2 + phi * 0.25);
  }

  function compatClass(n) {
    return n >= 75 ? 'compat-high' : n >= 55 ? 'compat-mid' : 'compat-low';
  }

  function renderSelector() {
    var grid = document.getElementById('selectorGrid');
    if (!grid) return;
    var allPeople = Object.values(_people).sort(function (a, b) {
      return a.isYou ? -1 : b.isYou ? 1 : 0;
    });
    if (!allPeople.length) {
      grid.innerHTML = '<div style="color:var(--muted);font-size:12px">Loading…</div>';
      return;
    }
    var hint = allPeople.length === 1
      ? '<div style="color:var(--muted);font-size:12px;margin-bottom:10px">Add friends on the <a href="/dashboard" style="color:var(--gold)">dashboard</a>, then select 2–6 people (including you).</div>'
      : '';
    grid.innerHTML = hint + allPeople.map(function (p) {
      var init = (p.displayName || '?').charAt(0).toUpperCase();
      var isSel = _selected.indexOf(p.uid) > -1;
      var cls = 'person-chip' + (p.isYou ? ' you' : '') + (isSel ? ' selected' : '');
      return '<div class="' + cls + '" data-uid="' + escapeHTML(p.uid) + '">'
        + '<div class="chip-avatar">' + init + '</div>'
        + '<div class="chip-info">'
        + '<div class="chip-name">' + escapeHTML(p.isYou ? 'You (' + p.displayName + ')' : p.displayName) + '</div>'
        + '<div class="chip-type">' + (p.mbti || 'No profile') + '</div>'
        + '</div>'
        + '<div class="chip-check">' + (isSel ? '&#10003;' : '') + '</div>'
        + '</div>';
    }).join('');
  }

  function togglePerson(uid) {
    var idx = _selected.indexOf(uid);
    if (idx > -1) _selected.splice(idx, 1);
    else {
      if (_selected.length >= 6) {
        showToast('Max 6 people at once');
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
    if (_selected.length < 2) {
      hint.textContent = _selected.length === 0
        ? 'Select 2–6 people to see group comparison'
        : 'Select at least one more person';
      content.innerHTML = '<div class="group-placeholder"><div class="group-placeholder-title">SELECT PEOPLE ABOVE</div><div>Choose 2 or more people to compare their personalities</div></div>';
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
            + '<br><span style="color:var(--gold);font-family:\'Bebas Neue\',sans-serif;font-size:14px">' + (p.mbti || '—') + '</span></th>';
        }).join('')
        + '</tr></thead><tbody>'
        + people.map(function (a) {
          return '<tr><td class="matrix-name">'
            + (a.isYou ? '<span style="color:var(--green)">You</span>' : escapeHTML(a.displayName.split(' ')[0]))
            + ' <span style="font-size:10px;color:var(--gold)">' + (a.mbti || '') + '</span></td>'
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

    var insightsHtml = '<div class="matrix-section"><div class="section-title">Group Insights</div><div class="insights-grid">'
      + (avgCompat !== null ? '<div class="insight-card"><div class="insight-label">Avg Compatibility</div><div class="insight-value ' + compatClass(avgCompat) + '">' + avgCompat + '<span style="font-size:16px">%</span></div><div class="insight-sub">across all pairs</div></div>' : '')
      + '<div class="insight-card"><div class="insight-label">Most Common Type</div><div class="insight-value">' + escapeHTML(mostCommon) + '</div><div class="insight-sub">' + (mbtiCounts[mostCommon] > 1 ? mbtiCounts[mostCommon] + ' people' : 'unique in group') + '</div></div>'
      + (mostEnn !== '—' ? '<div class="insight-card"><div class="insight-label">Common Ennea</div><div class="insight-value">' + escapeHTML(mostEnn) + '</div><div class="insight-sub">most frequent type</div></div>' : '')
      + '<div class="insight-card"><div class="insight-label">Group Politics</div><div class="insight-value" style="font-size:20px">' + polLabel + '<br>' + authLabel + '</div><div class="insight-sub">average position</div></div>'
      + '<div class="insight-card"><div class="insight-label">Group Size</div><div class="insight-value">' + people.length + '</div><div class="insight-sub">people selected</div></div>'
      + '</div></div>';

    content.innerHTML = cardsHtml + matrixHtml + insightsHtml;
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
        window.location.href = '/login';
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

  g.AnimusCompareGroup = { init: init, setModeVisible: function () { renderSelector(); } };
})(typeof window !== 'undefined' ? window : globalThis);
