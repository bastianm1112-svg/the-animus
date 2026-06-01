/**
 * Dedicated friends page — list, activity, add-friend modal.
 */
(function (g) {
  'use strict';

  function boot(auth, db) {
    if (typeof g.AnimusSocial !== 'undefined') {
      g.AnimusSocial.init(auth, db);
    }

    auth.onAuthStateChanged(function (user) {
      if (!user) {
        g.location.href = '/login?next=' + encodeURIComponent('/friends');
        return;
      }

      var sharedReady =
        typeof g.AnimusShared !== 'undefined' && g.AnimusShared.ensureUserDocument
          ? g.AnimusShared.ensureUserDocument(db, user)
          : db.collection('users').doc(user.uid).get().then(function (doc) {
              return doc.exists ? doc.data() : {};
            });
      sharedReady.then(function (userData) {
        userData = userData || {};
        if (typeof g.AnimusShared !== 'undefined') {
          g.AnimusShared.applyNavAvatar(document.getElementById('navAvatar'), user, userData);
        }
      });

      if (typeof g.AnimusSocial !== 'undefined') {
        g.AnimusSocial.loadFriends(user.uid);
        g.AnimusSocial.loadActivity(user.uid);
        g.AnimusSocial.loadNotifs(user.uid);
      }
    });
  }

  g.AnimusFriendsPage = { boot: boot };
})(typeof window !== 'undefined' ? window : globalThis);
