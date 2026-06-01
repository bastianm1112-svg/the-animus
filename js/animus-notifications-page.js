/**
 * Full-page notifications view.
 */
(function (g) {
  'use strict';

  function boot(auth, db) {
    if (typeof g.AnimusSocial !== 'undefined') {
      g.AnimusSocial.init(auth, db);
    }
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        g.location.href = '/login?next=' + encodeURIComponent('/notifications');
        return;
      }
      if (typeof g.AnimusShared !== 'undefined') {
        g.AnimusShared.applyNavAvatar(document.getElementById('navAvatar'), user, null);
        db.collection('users')
          .doc(user.uid)
          .get()
          .then(function (doc) {
            if (doc.exists) {
              g.AnimusShared.applyNavAvatar(document.getElementById('navAvatar'), user, doc.data());
            }
          });
      }
      g.AnimusSocial.loadNotifsPage(user.uid);
      g.AnimusSocial.refreshNotifBadge(user.uid);
    });
  }

  g.AnimusNotificationsPage = { boot: boot };
})(typeof window !== 'undefined' ? window : globalThis);
