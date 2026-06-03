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
        '<div class="activity-estimator animus-pressable">' +
        bodyStart +
        'What are they likely to do?' +
        bodyEnd +
        'Estimate someone&apos;s type from behavior you&apos;ve actually seen — saved separately from real account friends.</p></div>' +
        '<div class="activity-estimator-actions"><a href="/estimations" class="activity-estimator-cta shop-open-link animus-pressable">Open estimations</a></div>' +
        '</div></section>';
    } else {
      mount.innerHTML =
        '<section class="activity-estimations-section app-section">' +
        '<div class="home-section-head"><span class="home-section-title">Profile estimations</span></div>' +
        '<div class="activity-estimator activity-estimator-locked animus-pressable">' +
        bodyStart +
        'Behavioral estimator' +
        bodyEnd +
        'Unlock profile estimation in the <a href="/shop">Shop</a> to guess types from observed behavior — not your own self-report.</p></div>' +
        '<div class="activity-estimator-actions"><a href="/shop" class="activity-estimator-cta shop-open-link animus-pressable">View in Shop</a></div>' +
        '</div></section>';
    }
  }

  function fetchProfile(uid) {
    if (typeof g.AnimusShared !== 'undefined' && g.AnimusShared.fetchLatestProfile) {
      return g.AnimusShared.fetchLatestProfile(uid);
    }
    return g.db
      .collection('profiles')
      .doc(uid)
      .get()
      .then(function (pdoc) {
        return pdoc.exists && pdoc.data().latest ? pdoc.data().latest : null;
      });
  }

  function refreshAll(uid) {
    if (typeof g.AnimusSocial === 'undefined') return Promise.resolve();
    g.AnimusSocial.loadNotifsPage(uid);
    g.AnimusSocial.loadFriends(uid);
    g.AnimusSocial.loadActivity(uid);
    g.AnimusSocial.refreshNotifBadge(uid);
    return Promise.resolve();
  }

  function boot(auth, db) {
    g.db = db;
    if (typeof g.AnimusSocial !== 'undefined') {
      g.AnimusSocial.init(auth, db);
    }

    auth.onAuthStateChanged(function (user) {
      if (!user) {
        g.location.replace('/login?next=' + encodeURIComponent('/activity'));
        return;
      }

      fetchProfile(user.uid).then(function (profile) {
        g.__animusUserProfile = profile;
      });

      db.collection('users')
        .doc(user.uid)
        .get()
        .then(function (doc) {
          var data = doc.exists ? doc.data() : {};
          var entitled =
            g.AnimusEntitlements && g.AnimusEntitlements.hasEntitlement(data, 'testEstimator');
          renderEstimator(entitled);
        });

      refreshAll(user.uid);

      var main = document.getElementById('main-content');
      if (main && g.AnimusPullRefresh) {
        main.classList.add('pull-refresh-root');
        g.AnimusPullRefresh.attach({
          root: main,
          onRefresh: function () {
            return fetchProfile(user.uid).then(function (profile) {
              g.__animusUserProfile = profile;
              return refreshAll(user.uid);
            });
          }
        });
      }
    });
  }

  g.AnimusActivityPage = { boot: boot, refreshAll: refreshAll };
})(typeof window !== 'undefined' ? window : globalThis);
