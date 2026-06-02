/**
 * Combined Activity page — requests, friends, feed, estimator, XP.
 */
(function (g) {
  'use strict';

  function escapeHTML(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderEstimator(entitled) {
    var mount = document.getElementById('estimatorMount');
    if (!mount) return;
    if (entitled) {
      mount.innerHTML =
        '<div class="activity-estimator">' +
        '<div><div class="activity-estimator-title">Test Estimator</div>' +
        '<p class="activity-estimator-desc">Answer based on how someone behaves — not your own self-report. Save estimated profiles for friends and family.</p></div>' +
        '<button type="button" class="activity-estimator-cta" id="startEstimatorBtn">Start estimator</button>' +
        '</div>';
      var btn = document.getElementById('startEstimatorBtn');
      if (btn) {
        btn.onclick = function () {
          var name = prompt('Who are you estimating? (name or nickname)');
          if (!name || !name.trim()) return;
          g.location.href =
            '/test?mode=estimator&name=' + encodeURIComponent(name.trim().substring(0, 64));
        };
      }
    } else {
      mount.innerHTML =
        '<div class="activity-estimator activity-estimator-locked">' +
        '<div><div class="activity-estimator-title">Test Estimator</div>' +
        '<p class="activity-estimator-desc">Unlock profile estimation in the <a href="/shop">Shop</a> to guess someone&apos;s type from observed behavior.</p></div>' +
        '<a href="/shop" class="activity-estimator-cta" style="display:inline-flex;align-items:center;text-decoration:none">View in Shop</a>' +
        '</div>';
    }
  }

  function boot(auth, db) {
    if (typeof g.AnimusSocial !== 'undefined') {
      g.AnimusSocial.init(auth, db);
    }

    auth.onAuthStateChanged(function (user) {
      if (!user) {
        g.location.replace('/login?next=' + encodeURIComponent('/activity'));
        return;
      }

      db.collection('users')
        .doc(user.uid)
        .get()
        .then(function (doc) {
          var data = doc.exists ? doc.data() : {};
          if (g.AnimusXp) {
            g.AnimusXp.renderXpBar(document.getElementById('activityXpMount'), data);
          }
          var entitled =
            g.AnimusEntitlements && g.AnimusEntitlements.hasEntitlement(data, 'testEstimator');
          renderEstimator(entitled);
        });

      g.AnimusSocial.loadNotifsPage(user.uid);
      g.AnimusSocial.loadFriends(user.uid);
      g.AnimusSocial.loadActivity(user.uid);
      g.AnimusSocial.refreshNotifBadge(user.uid);
    });
  }

  g.AnimusActivityPage = { boot: boot };
})(typeof window !== 'undefined' ? window : globalThis);
