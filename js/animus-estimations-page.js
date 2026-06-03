/**
 * Estimations list — people you estimate (not friends).
 */
(function (g) {
  'use strict';

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () {
      el.classList.remove('show');
    }, 2800);
  }

  function formatDate(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderLocked(mount) {
    mount.innerHTML =
      '<div class="activity-estimator activity-estimator-locked">' +
      '<div><div class="activity-estimator-title">Profile Estimator</div>' +
      '<p class="activity-estimator-desc">Unlock estimation in the <a href="/shop">Shop</a> to build behavioral guesses from what you&apos;ve observed.</p></div>' +
      '<a href="/shop" class="activity-estimator-cta shop-open-link">View in Shop</a>' +
      '</div>';
  }

  function renderList(mount, docs, highlightId) {
    var html =
      '<div class="estimations-toolbar">' +
      '<button type="button" class="activity-estimator-cta" id="addEstimationBtn">+ Estimate someone</button>' +
      '</div>';

    if (!docs.length) {
      html +=
        '<div class="estimations-empty">No estimations yet. Add someone you know from the outside — coworkers, family, friends — and answer from visible behavior only.</div>';
    } else {
      html += '<div class="estimations-grid">';
      docs.forEach(function (doc) {
        var d = doc.data();
        var id = doc.id;
        var name = (d.subjectName || 'Someone').trim();
        var status = d.status || 'draft';
        var sum = d.summary || {};
        var hl = highlightId === id ? ' estimations-card-highlight' : '';
        html += '<article class="estimations-card' + hl + '" data-id="' + id + '">';
        html += '<div class="estimations-card-head">';
        html += '<h2 class="estimations-card-name">' + AnimusEstimator.escapeHTML(name) + '</h2>';
        html += '<span class="estimations-card-status estimations-status-' + status + '">' + status + '</span>';
        html += '</div>';
        if (status === 'complete' && sum.mbti) {
          html +=
            '<p class="estimations-card-type">' +
            AnimusEstimator.escapeHTML(sum.mbti) +
            (sum.ennType ? ' · ' + AnimusEstimator.escapeHTML('E' + sum.ennType + 'w' + (sum.ennWing || '')) : '') +
            '</p>';
          if (sum.tagline) {
            html += '<p class="estimations-card-tag">' + AnimusEstimator.escapeHTML(sum.tagline) + '</p>';
          }
        } else {
          html += '<p class="estimations-card-tag">Draft — finish the estimator from observed behavior.</p>';
        }
        html += '<p class="estimations-card-date">' + formatDate(d.updatedAt || d.createdAt) + '</p>';
        html += '<div class="estimations-card-actions">';
        if (status === 'complete') {
          html +=
            '<a class="estimations-card-btn" href="/test?mode=estimator&estimation=' +
            encodeURIComponent(id) +
            '&name=' +
            encodeURIComponent(name) +
            '&view=1">View results</a>';
          html +=
            '<a class="estimations-card-btn estimations-card-btn-sec" href="' +
            AnimusEstimator.testUrl(id, name) +
            '">Re-estimate</a>';
        } else {
          html +=
            '<a class="estimations-card-btn" href="' + AnimusEstimator.testUrl(id, name) + '">Continue</a>';
        }
        html += '</div></article>';
      });
      html += '</div>';
    }

    mount.innerHTML = html;

    var addBtn = document.getElementById('addEstimationBtn');
    if (addBtn) {
      addBtn.onclick = function () {
        var name = prompt('Who are you estimating? (name or nickname — not a friend link)');
        if (!name || !name.trim()) return;
        var uid = g._estimationsUid;
        if (!uid) return;
        AnimusEstimator.createEstimation(db, uid, name.trim())
          .then(function (estId) {
            g.location.href = AnimusEstimator.testUrl(estId, name.trim());
          })
          .catch(function () {
            toast('Could not create estimation. Try again.');
          });
      };
    }
  }

  function boot(auth, db) {
    var mount = document.getElementById('estimationsMount');
    if (!mount) return;

    auth.onAuthStateChanged(function (user) {
      if (!user) {
        g.location.replace('/login?next=' + encodeURIComponent('/estimations'));
        return;
      }
      g._estimationsUid = user.uid;

      db.collection('users')
        .doc(user.uid)
        .get()
        .then(function (doc) {
          var data = doc.exists ? doc.data() : {};
          var entitled =
            g.AnimusEntitlements && g.AnimusEntitlements.hasEntitlement(data, 'testEstimator');
          if (!entitled) {
            renderLocked(mount);
            return;
          }
          var highlight = '';
          try {
            highlight = new URLSearchParams(g.location.search).get('id') || '';
          } catch (e) {}
          return AnimusEstimator.listEstimations(db, user.uid).then(function (snap) {
            var docs = [];
            snap.forEach(function (d) {
              docs.push(d);
            });
            renderList(mount, docs, highlight);
          });
        })
        .catch(function () {
          mount.innerHTML = '<div class="estimations-empty">Could not load estimations.</div>';
        });
    });
  }

  g.AnimusEstimationsPage = { boot: boot };
})(typeof window !== 'undefined' ? window : globalThis);
