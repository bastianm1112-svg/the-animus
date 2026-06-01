/**
 * Logged-in home on index — greeting, daily fact, quick actions, friends.
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

  function scrollToHash() {
    if (location.hash === '#friends') {
      var el = document.getElementById('member-friends');
      if (el) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth' }); }, 300);
    }
  }

  function setMemberMode(on) {
    if (on) {
      document.body.classList.add('member-mode');
    } else {
      document.body.classList.remove('member-mode');
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
      scrollToHash();

      var greetEl = document.getElementById('homeGreeting');
      var displayName = escapeHTML(user.displayName || user.email.split('@')[0]);

      db.collection('users')
        .doc(user.uid)
        .get()
        .then(function (doc) {
          var userData = doc.exists ? doc.data() : {};
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
        });

      db.collection('profiles')
        .doc(user.uid)
        .get()
        .then(function (pdoc) {
          var profile = pdoc.exists && pdoc.data().latest ? pdoc.data().latest : null;
          if (!profile && typeof g.AnimusShared !== 'undefined') {
            var local = g.AnimusShared.loadLastResultLocal();
            if (local && local.mbti) profile = local;
          }
          var factEl = document.getElementById('dailyFactText');
          var factLabel = document.getElementById('dailyFactLabel');
          if (g.AnimusDailyFacts && factEl) {
            var fact = g.AnimusDailyFacts.pickDailyFact(profile, user.uid);
            factEl.textContent = fact.text;
            if (factLabel) factLabel.textContent = 'Daily insight · ' + fact.label;
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
        g.AnimusSocial.loadFriends(user.uid);
        g.AnimusSocial.loadActivity(user.uid);
        g.AnimusSocial.loadNotifs(user.uid);
      }
    });
  }

  g.AnimusHome = { boot: boot };
})(typeof window !== 'undefined' ? window : globalThis);
