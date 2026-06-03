/* Shared friends list + user doc bootstrap for Compare pages */
(function (g) {
  'use strict';

  function defaultUsername(user, pending) {
    if (pending && pending.username) return pending.username;
    var base = (user.displayName || (user.email ? user.email.split('@')[0] : '') || 'user')
      .toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    return base || ('user' + Date.now().toString().slice(-6));
  }

  function ensureUserDocument(db, user) {
    if (!user || !db) return Promise.resolve(null);
    return db.collection('users').doc(user.uid).get().then(function (doc) {
      if (doc.exists) return doc.data();
      var pending = null;
      try { pending = JSON.parse(localStorage.getItem('animus_pending_doc') || 'null'); } catch (e) {}
      var userData = {
        displayName: (pending && pending.displayName) || user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        username: defaultUsername(user, pending),
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        friends: [],
        friendRequests: { sent: [], received: [] },
        language: localStorage.getItem('animus_lang') || 'en'
      };
      return db.collection('users').doc(user.uid).set(userData).then(function () {
        return db.collection('usernames').doc(userData.username).set({ uid: user.uid });
      }).then(function () {
        localStorage.removeItem('animus_pending_doc');
        return userData;
      });
    });
  }

  function friendCompareHref(friend) {
    if (friend.username) return '/compare?u=' + encodeURIComponent(friend.username);
    return '/compare?uid=' + encodeURIComponent(friend.uid);
  }

  function fetchFriends(db, authUser) {
    var uid = authUser.uid;
    return ensureUserDocument(db, authUser).then(function () {
      return db.collection('users').doc(uid).get();
    }).then(function (doc) {
      if (!doc.exists) return [];
      var friendUids = (doc.data().friends || []).filter(function (v, i, a) {
        return v && a.indexOf(v) === i && v !== uid;
      });
      if (!friendUids.length) return [];
      return Promise.all(friendUids.map(function (fuid) {
        return Promise.all([
          db.collection('users').doc(fuid).get(),
          db.collection('profiles').doc(fuid).get()
        ]).then(function (res) {
          var uDoc = res[0];
          var pDoc = res[1];
          if (!uDoc.exists) return null;
          var u = uDoc.data();
          var snap = pDoc.exists ? (pDoc.data().latest || {}) : {};
          var uname = (u.username || '').trim();
          return {
            uid: fuid,
            username: uname,
            displayName: u.displayName || uname || 'Friend',
            mbti: snap.mbti || '',
            ennType: snap.ennType,
            ennWing: snap.ennWing,
            hasProfile: !!snap.mbti,
            href: uname ? '/compare?u=' + encodeURIComponent(uname) : '/compare?uid=' + encodeURIComponent(fuid)
          };
        });
      })).then(function (rows) {
        return rows.filter(Boolean);
      });
    });
  }

  function populateFriendSelect(select, friends, selectedValue) {
    if (!select) return;
    while (select.options.length > 1) select.remove(1);
    friends.forEach(function (f) {
      var opt = document.createElement('option');
      opt.value = f.username || ('uid:' + f.uid);
      opt.textContent = (f.displayName || 'Friend') + (f.mbti ? ' · ' + f.mbti : '') + (f.username ? ' (@' + f.username + ')' : '');
      if (selectedValue && (selectedValue === f.username || selectedValue === f.uid || selectedValue === ('uid:' + f.uid))) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  }

  function onFriendSelectChange(select) {
    if (!select || !select.value) return;
    var v = select.value;
    if (v.indexOf('uid:') === 0) {
      window.location.href = '/compare?uid=' + encodeURIComponent(v.slice(4));
    } else {
      window.location.href = '/compare?u=' + encodeURIComponent(v);
    }
  }

  var escapeHTML = g.AnimusShared.escapeHTML;

  function renderComparePicker(container, friends, selectedValue) {
    if (!container) return;
    if (!friends.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = friends
      .map(function (f) {
        var sel =
          selectedValue &&
          (selectedValue === f.username ||
            selectedValue === f.uid ||
            selectedValue === 'uid:' + f.uid);
        var cls =
          'compare-friend-chip' + (sel ? ' active' : '') + (f.hasProfile ? '' : ' no-profile');
        var init = escapeHTML((f.displayName || '?').charAt(0).toUpperCase());
        var types = f.mbti
          ? escapeHTML(f.mbti) +
            (f.ennType ? ' · ' + escapeHTML(String(f.ennType) + 'w' + (f.ennWing || '')) : '')
          : 'No assessment yet';
        return (
          '<a href="' +
          escapeHTML(f.href) +
          '" class="' +
          cls +
          '">' +
          '<span class="chip-avatar">' +
          init +
          '</span>' +
          '<span class="chip-meta">' +
          '<span class="chip-name">' +
          escapeHTML(f.displayName || 'Friend') +
          '</span>' +
          '<span class="chip-types">' +
          types +
          '</span></span></a>'
        );
      })
      .join('');
  }

  g.AnimusCompareFriends = {
    ensureUserDocument: ensureUserDocument,
    fetchFriends: fetchFriends,
    populateFriendSelect: populateFriendSelect,
    renderComparePicker: renderComparePicker,
    onFriendSelectChange: onFriendSelectChange,
    friendCompareHref: friendCompareHref
  };
})(typeof window !== 'undefined' ? window : globalThis);
