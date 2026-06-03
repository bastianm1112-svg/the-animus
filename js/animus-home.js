/**
 * Logged-in home on index — greeting, XP, daily insight, quick actions.
 */
(function (g) {
  'use strict';

  function escapeHTML(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function greetingForHour(h) {
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function formatDate(d) {
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function setMemberMode(on) {
    if (on) {
      document.body.classList.add('member-mode');
    } else {
      document.body.classList.remove('member-mode');
    }
  }

  function updateDailyXpBadge(userData) {
    var badge = document.getElementById('dailyXpBadge');
    if (!badge || !g.AnimusXp) return;
    var claimed = userData && userData.lastDailyInsight === todayKey();
    if (claimed) {
      badge.textContent = 'Claimed today';
      badge.classList.add('is-claimed');
      badge.hidden = false;
    } else {
      badge.textContent = '+' + (g.AnimusXp.XP_AWARDS.daily_insight || 5) + ' XP';
      badge.classList.remove('is-claimed');
      badge.hidden = false;
    }
  }

  function renderHomeRetention(userData, profile, user, db) {
    if (g.AnimusXp) {
      g.AnimusXp.renderXpBar(document.getElementById('homeXpMount'), userData);
    }
    updateDailyXpBadge(userData);

    var factEl = document.getElementById('dailyFactText');
    var factLabel = document.getElementById('dailyFactLabel');
    if (g.AnimusDailyFacts && factEl) {
      var fact = g.AnimusDailyFacts.pickDailyFact(profile, user.uid);
      factEl.textContent = fact.text;
      if (factLabel) factLabel.textContent = 'Daily insight · ' + fact.label;
    }

    function refreshRetention(fresh) {
      window.__animusHomeUserData = fresh;
      if (g.AnimusXp) {
        g.AnimusXp.renderXpBar(document.getElementById('homeXpMount'), fresh);
      }
      updateDailyXpBadge(fresh);
      if (g.AnimusDaily) {
        var dailyRefresh = g.AnimusDaily.refresh || g.AnimusDaily.render;
        dailyRefresh(db, user.uid, fresh, profile, refreshRetention);
      }
    }

    if (g.AnimusXp && profile && profile.mbti) {
      g.AnimusXp.awardDailyInsightIfNew(db, user.uid, userData).then(function () {
        return db.collection('users').doc(user.uid).get();
      }).then(function (doc) {
        refreshRetention(doc.exists ? doc.data() : userData);
      }).catch(function () {});
    }

    if (g.AnimusDaily && profile && profile.mbti) {
      g.AnimusDaily.boot(db, user.uid, userData, profile, refreshRetention).then(function (fresh) {
        if (fresh) refreshRetention(fresh);
      }).catch(function () {});
    }
  }

  function boot(auth, db) {
    if (typeof g.AnimusSocial !== 'undefined') {
      g.AnimusSocial.init(auth, db);
    }

    var now = new Date();
    var hour = now.getHours();
    var greet = greetingForHour(hour);
    var dateEl = document.getElementById('homeDate');
    if (dateEl) dateEl.textContent = formatDate(now);

    auth.onAuthStateChanged(function (user) {
      if (!user) {
        setMemberMode(false);
        return;
      }
      setMemberMode(true);
      if (location.hash === '#friends') {
        g.location.replace('/activity');
        return;
      }

      var greetEl = document.getElementById('homeGreeting');
      var displayName = escapeHTML(user.displayName || user.email.split('@')[0]);

      var userPromise = db.collection('users')
        .doc(user.uid)
        .get()
        .then(function (doc) {
          var userData = doc.exists ? doc.data() : {};
          window.__animusHomeUserData = userData;
          if (userData.displayName) {
            displayName = escapeHTML(userData.displayName);
          }
          if (greetEl) {
            greetEl.innerHTML = greet + ', <em>' + displayName + '</em>';
          }
          if (typeof g.AnimusShared !== 'undefined') {
            g.AnimusShared.applyNavAvatar(document.getElementById('navAvatar'), user, userData);
          }
          if (!doc.exists && typeof g.AnimusShared !== 'undefined') {
            var pending = null;
            try {
              pending = JSON.parse(localStorage.getItem('animus_pending_doc') || 'null');
            } catch (e) {}
            var defaultUsername =
              (user.displayName || user.email.split('@')[0] || 'user')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 20) || 'user' + Date.now().toString().slice(-6);
            var newDoc = {
              displayName: (pending && pending.displayName) || user.displayName || 'User',
              username: (pending && pending.username) || defaultUsername,
              email: user.email || '',
              photoURL: user.photoURL || '',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              friends: [],
              friendRequests: { sent: [], received: [] },
              language: localStorage.getItem('animus_lang') || 'en'
            };
            db.collection('users')
              .doc(user.uid)
              .set(newDoc)
              .then(function () {
                return db.collection('usernames').doc(newDoc.username).set({ uid: user.uid });
              })
              .then(function () {
                localStorage.removeItem('animus_pending_doc');
              })
              .catch(function () {});
          }
          return userData;
        });

      var profilePromise =
        typeof g.AnimusShared !== 'undefined' && g.AnimusShared.fetchLatestProfile
          ? g.AnimusShared.fetchLatestProfile(user.uid)
          : db
              .collection('profiles')
              .doc(user.uid)
              .get()
              .then(function (pdoc) {
                return pdoc.exists && pdoc.data().latest ? pdoc.data().latest : null;
              });

      Promise.all([userPromise, profilePromise]).then(function (results) {
        var userData = results[0];
        var profile = results[1];
        renderHomeRetention(userData, profile, user, db);

        var factEl = document.getElementById('dailyFactText');
        if (!profile || !profile.mbti) {
          if (factEl) {
            factEl.textContent =
              'Complete your assessment to unlock a personalized insight each day.';
          }
          var badge = document.getElementById('dailyXpBadge');
          if (badge) badge.hidden = true;
        }

        var banner = document.getElementById('onboardingBanner');
        if (banner) {
          if (profile && profile.mbti) {
            banner.classList.remove('show');
          } else {
            banner.classList.add('show');
            if (typeof g.AnimusShared !== 'undefined') {
              g.AnimusShared.trySyncLocalResultToFirestore(user).then(function (synced) {
                if (synced) g.location.reload();
              });
            }
          }
        }
      });

      if (typeof g.AnimusSocial !== 'undefined') {
        g.AnimusSocial.refreshNotifBadge(user.uid);
      }
    });
  }

  g.AnimusHome = { boot: boot };
})(typeof window !== 'undefined' ? window : globalThis);
