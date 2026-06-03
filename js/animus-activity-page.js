/**
 * Combined Activity page — requests, friends, feed, estimator teaser.
 */
(function (g) {
  'use strict';

  function renderEstimator(entitled) {
    var mount = document.getElementById('estimatorMount');
    if (!mount) return;
    var bodyStart =
      '<div class="activity-estimator-body">' +
      '<div class="activity-estimator-title">';
    var bodyEnd =
      '</div>' +
      '<p class="activity-estimator-desc">';
    if (entitled) {
      mount.innerHTML =
        '<section class="activity-estimations-section app-section" aria-labelledby="estimationsTeaserTitle">' +
        '<div class="home-section-head"><span class="home-section-title" id="estimationsTeaserTitle">Profile estimations</span></div>' +
        '<div class="activity-estimator">' +
        bodyStart +
        'What are they likely to do?' +
        bodyEnd +
        'Estimate someone&apos;s type from behavior you&apos;ve actually seen — saved separately from real account friends.</p></div>' +
        '<a href="/estimations" class="activity-estimator-cta shop-open-link">Open estimations</a>' +
        '</div></section>';
    } else {
      mount.innerHTML =
        '<section class="activity-estimations-section app-section">' +
        '<div class="home-section-head"><span class="home-section-title">Profile estimations</span></div>' +
        '<div class="activity-estimator activity-estimator-locked">' +
        bodyStart +
        'Behavioral estimator' +
        bodyEnd +
        'Unlock profile estimation in the <a href="/shop">Shop</a> to guess types from observed behavior — not your own self-report.</p></div>' +
        '<a href="/shop" class="activity-estimator-cta shop-open-link">View in Shop</a>' +
        '</div></section>';
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
