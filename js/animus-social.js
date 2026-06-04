/**
 * Friends, notifications, and friend search — shared across home and app pages.
 */
(function (g) {
  'use strict';

  var auth = null;
  var db = null;
  var escapeHTML = g.AnimusShared.escapeHTML;

  function init(a, d) {
    auth = a;
    db = d;
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    var safe =
      typeof g.AnimusSafe !== 'undefined' && g.AnimusSafe.safeText
        ? g.AnimusSafe.safeText(msg, 240)
        : String(msg == null ? '' : msg);
    t.textContent = safe;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.classList.remove('show');
    }, 2400);
  }

  function getTimeAgo(date) {
    var diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
    return Math.floor(diff / 86400) + ' days ago';
  }

  function openFriends() {
    g.location.href = '/activity';
  }

  function openNotifs() {
    g.location.href = '/notifications';
  }

  function toggleNotifs() {
    openNotifs();
  }

  function openAddFriend() {
    var modal = document.getElementById('addFriendModal');
    if (!modal) {
      g.location.href = '/activity';
      return;
    }
    modal.classList.add('open');
    setTimeout(function () {
      var inp = document.getElementById('friendSearchInput');
      if (inp) inp.focus();
    }, 100);
  }

  function closeAddFriend() {
    var modal = document.getElementById('addFriendModal');
    if (!modal) return;
    modal.classList.remove('open');
    var res = document.getElementById('searchResults');
    if (res) res.innerHTML = '<div class="search-empty">Start typing to search for people</div>';
    var inp = document.getElementById('friendSearchInput');
    if (inp) inp.value = '';
  }

  function getProfileContext() {
    return g.__animusUserProfile || null;
  }

  function loadFriends(uid) {
    if (!db) return;
    var grid = document.getElementById('friendsGrid');
    if (!grid) return;
    db.collection('users')
      .doc(uid)
      .get()
      .then(function (doc) {
        if (!doc.exists) return;
        var friends = (doc.data().friends || []).filter(function (v, i, a) {
          return a.indexOf(v) === i;
        });
        grid.innerHTML = '';
        if (!friends.length) {
          var cta =
            '<button type="button" class="empty-state-cta animus-pressable" onclick="AnimusSocial.openAddFriend()">+ Add friend</button>';
          grid.innerHTML =
            g.AnimusTypeUi && g.AnimusTypeUi.emptyStateHtml
              ? g.AnimusTypeUi.emptyStateHtml('friends', getProfileContext(), cta)
              : '<div class="empty-state">No friends yet — add someone to get started</div>';
        }
        var promises = friends.map(function (fuid) {
          return Promise.all([
            db.collection('users').doc(fuid).get(),
            db.collection('profiles').doc(fuid).get()
          ]).then(function (results) {
            var uDoc = results[0];
            var pDoc = results[1];
            if (!uDoc.exists) return;
            var u = uDoc.data();
            var p = pDoc.exists ? pDoc.data().latest : {};
            var init = escapeHTML((u.displayName || '?').charAt(0).toUpperCase());
            var dname = escapeHTML(u.displayName || '');
            var uname = escapeHTML(u.username || '');
            var mbti = escapeHTML((p && p.mbti) || '—');
            var enn = p && p.ennType ? p.ennType + 'w' + p.ennWing : '—';
            var href =
              typeof g.AnimusShared !== 'undefined'
                ? AnimusShared.profileHrefForUser(u.username, fuid)
                : u.username
                  ? '/' + encodeURIComponent(u.username)
                  : '/profile?uid=' + encodeURIComponent(fuid);
            var card = document.createElement('a');
            card.href = href;
            card.className = 'friend-card animus-pressable';
            if (g.AnimusTypeUi && p && p.mbti) {
              card.classList.add(g.AnimusTypeUi.accentClassFor(p.mbti));
            }
            card.innerHTML =
              '<div class="friend-avatar">' +
              init +
              '</div><div class="friend-name">' +
              dname +
              '</div><div class="friend-username">@' +
              uname +
              '</div><div class="friend-type">' +
              mbti +
              '</div><div class="friend-enn">' +
              escapeHTML(enn) +
              '</div>';
            grid.appendChild(card);
          });
        });
        return Promise.all(promises).then(function () {
          var addBtn = document.createElement('button');
          addBtn.type = 'button';
          addBtn.className = 'friend-card friend-card-add';
          addBtn.onclick = openAddFriend;
          addBtn.innerHTML =
            '<div class="add-icon">+</div><div class="add-label">Add Friend</div>';
          grid.appendChild(addBtn);
        });
      });
  }

  function loadActivity(uid) {
    if (!db) return;
    var feed = document.getElementById('feedItems');
    if (!feed) return;
    db.collection('activity')
      .doc(uid)
      .collection('feed')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get()
      .then(function (snap) {
        if (snap.empty) {
          if (g.AnimusTypeUi && g.AnimusTypeUi.emptyStateHtml) {
            feed.innerHTML = g.AnimusTypeUi.emptyStateHtml('feed', getProfileContext(), '');
          }
          return;
        }
        feed.innerHTML = '';
        snap.forEach(function (doc) {
          var a = doc.data();
          var item = document.createElement('div');
          item.className = 'feed-item';
          var timeAgo = escapeHTML(a.timestamp ? getTimeAgo(a.timestamp.toDate()) : '');
          var txt = a.text || '';
          var iconSVG =
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
          var isFriendReq =
            a.type === 'friend_request' ||
            (!a.type && a.fromUid && txt.indexOf('sent you a friend request') > -1);
          var actionHtml = '';
          if (isFriendReq && a.fromUid) {
            actionHtml =
              '<div class="feed-actions">' +
              '<button type="button" class="btn-add-small btn-add-small--accept" data-uid="' +
              escapeHTML(a.fromUid) +
              '" data-name="' +
              escapeHTML(a.fromName || '') +
              '" onclick="AnimusSocial.acceptFriendRequest(this.dataset.uid,this.dataset.name);this.closest(\'.feed-item\').remove()">Accept</button>' +
              '<button type="button" class="btn-add-small" data-uid="' +
              escapeHTML(a.fromUid) +
              '" onclick="AnimusSocial.declineFriendRequest(this.dataset.uid);this.closest(\'.feed-item\').remove()">Decline</button>' +
              '</div>';
          } else if (a.link) {
            var safeLink =
              typeof g.AnimusShared !== 'undefined' && g.AnimusShared.safeInternalHref
                ? g.AnimusShared.safeInternalHref(a.link)
                : '';
            if (safeLink) {
              actionHtml =
                '<a href="' +
                escapeHTML(safeLink) +
                '" class="feed-action">View →</a>';
            }
          }
          item.innerHTML =
            '<div class="feed-icon">' +
            iconSVG +
            '</div><div class="feed-content"><div class="feed-text">' +
            escapeHTML(txt) +
            '</div><div class="feed-time">' +
            timeAgo +
            '</div>' +
            actionHtml +
            '</div>';
          feed.appendChild(item);
        });
      })
      .catch(function () {});
  }

  var searchTimer = null;
  function searchUsers(val) {
    clearTimeout(searchTimer);
    var res = document.getElementById('searchResults');
    if (!res) return;
    if (!val.trim()) {
      res.innerHTML = '<div class="search-empty">Start typing to search for people</div>';
      return;
    }
    res.innerHTML = '<div class="search-empty">Searching...</div>';
    searchTimer = setTimeout(function () {
      var q = val.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
      if (q.length < 2) {
        res.innerHTML = '<div class="search-empty">Type at least 2 characters</div>';
        return;
      }
      var currentUser = auth && auth.currentUser;
      var tasks = [
        db
          .collection('usernames')
          .where(firebase.firestore.FieldPath.documentId(), '>=', q)
          .where(firebase.firestore.FieldPath.documentId(), '<=', q + '\uf8ff')
          .limit(8)
          .get(),
        db
          .collection('users')
          .where('username', '>=', q)
          .where('username', '<=', q + '\uf8ff')
          .limit(8)
          .get()
      ];
      if (q.length >= 3 && typeof AnimusShared !== 'undefined' && AnimusShared.resolveUsernameToUid) {
        tasks.push(
          AnimusShared.resolveUsernameToUid(db, q)
            .then(function (uid) {
              return db.collection('users').doc(uid).get();
            })
            .catch(function () {
              return null;
            })
        );
      }
      Promise.all(tasks)
        .then(function (parts) {
          var byUid = {};
          function addRow(uid, handle, userData) {
            if (!uid || (currentUser && uid === currentUser.uid)) return;
            var canonical =
              userData && userData.username
                ? String(userData.username).toLowerCase().replace(/[^a-z0-9_]/g, '')
                : handle;
            if (!canonical) canonical = handle;
            if (!byUid[uid] || canonical === handle) {
              byUid[uid] = {
                uid: uid,
                username: canonical,
                user: userData || {}
              };
            }
          }
          var indexSnap = parts[0];
          var usersSnap = parts[1];
          var exactDoc = parts[2];
          (indexSnap.docs || []).forEach(function (d) {
            addRow(d.data().uid, d.id, null);
          });
          (usersSnap.docs || []).forEach(function (d) {
            addRow(d.id, (d.data() || {}).username || d.id, d.data());
          });
          if (exactDoc && exactDoc.exists) {
            addRow(exactDoc.id, (exactDoc.data() || {}).username || q, exactDoc.data());
          }
          var uids = Object.keys(byUid);
          if (!uids.length) {
            res.innerHTML =
              '<div class="search-empty">No users found for @' + escapeHTML(q) + '</div>';
            return;
          }
          return Promise.all(
            uids.map(function (uid) {
              if (byUid[uid].user && byUid[uid].user.displayName) return byUid[uid];
              return db
                .collection('users')
                .doc(uid)
                .get()
                .then(function (uDoc) {
                  var data = uDoc.exists ? uDoc.data() : byUid[uid].user;
                  var canonical = (data && data.username) || byUid[uid].username;
                  return { uid: uid, username: canonical, user: data || {} };
                });
            })
          ).then(function (results) {
            res.innerHTML = '';
            results.forEach(function (r) {
              var n = escapeHTML(r.user.displayName || 'User');
              var u = escapeHTML(r.username || '');
              var profilePath =
                typeof AnimusShared !== 'undefined' && AnimusShared.profilePathForUsername
                  ? AnimusShared.profilePathForUsername(u)
                  : '/' + encodeURIComponent(u);
              var init = n.charAt(0).toUpperCase();
              res.innerHTML +=
                '<div class="search-result-item">' +
                '<a href="' +
                profilePath +
                '" class="search-result-avatar" style="text-decoration:none;color:inherit">' +
                init +
                '</a><div class="search-result-info"><div class="search-result-name">' +
                '<a href="' +
                profilePath +
                '" style="color:inherit;text-decoration:none">' +
                n +
                '</a> <span style="color:var(--muted);font-weight:400">@' +
                u +
                '</span></div></div>' +
                '<button type="button" class="btn-add-small" data-uid="' +
                escapeHTML(r.uid) +
                '" data-name="' +
                n +
                '" onclick="AnimusSocial.sendFriendRequest(this.dataset.uid,this.dataset.name,this)">Add</button></div>';
            });
          });
        })
        .catch(function () {
          res.innerHTML = '<div class="search-empty">Search unavailable</div>';
        });
    }, 400);
  }

  function asFriendIdList(val) {
    return Array.isArray(val) ? val : [];
  }

  function assertFriendRequestsShape(data, whoLabel) {
    var fr = data.friendRequests;
    if (fr === undefined || fr === null) return;
    if (typeof fr !== 'object' || Array.isArray(fr)) {
      throw {
        code: 'failed-precondition',
        message:
          whoLabel +
          ' account has corrupted friend-list data. They should open https://animustest.com/activity once while signed in.'
      };
    }
    if (fr.sent !== undefined && !Array.isArray(fr.sent)) {
      throw { code: 'failed-precondition', message: whoLabel + ' friend list needs repair (invalid sent field).' };
    }
    if (fr.received !== undefined && !Array.isArray(fr.received)) {
      throw { code: 'failed-precondition', message: whoLabel + ' friend list needs repair (invalid received field).' };
    }
  }

  function friendRequestErrorMessage(e) {
    if (!e) return 'Something went wrong';
    if (e.userMessage) return e.userMessage;
    if (e.code === 'not-found') {
      return 'That user has no account record yet. They need to sign up and open the app home page once.';
    }
    if (e.code === 'failed-precondition') {
      return e.message || 'Account data needs a quick repair on their side.';
    }
    if (e.code === 'permission-denied') {
      if (e.stage === 'their') {
        return 'Could not update their friend list. Ask them to open the Friends page once while signed in, then try again.';
      }
      if (e.stage === 'yours') {
        return 'Could not update your friend list. Refresh the page or open the Friends page, then try again.';
      }
      return 'Server blocked this request (permissions). If it keeps happening, tell us — a rules update may still be deploying.';
    }
    return e.message || 'Request failed';
  }

  function writeFriendRequestActivity(toUid, user, type, text) {
    var actRef = db.collection('activity').doc(toUid).collection('feed').doc();
    return actRef.set({
      type: type,
      text: text,
      fromUid: user.uid,
      fromName: (user.displayName || 'Someone').substring(0, 48),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function (err) {
      console.warn('Activity feed write skipped:', err && err.code, err && err.message);
    });
  }

  function sendFriendRequest(toUid, toName, btn) {
    var user = auth && auth.currentUser;
    if (!user) {
      showToast('Sign in to add friends');
      return;
    }
    if (toUid === user.uid) {
      showToast("That's you!");
      return;
    }
    if (btn) {
      btn.textContent = 'Sending...';
      btn.disabled = true;
    }
    var ensureDoc =
      typeof g.AnimusShared !== 'undefined' && g.AnimusShared.ensureUserDocument
        ? g.AnimusShared.ensureUserDocument(db, user)
        : Promise.resolve();
    ensureDoc
      .then(function () {
        return db.collection('users').doc(toUid).get();
      })
      .then(function (targetDoc) {
        if (!targetDoc.exists) {
          throw { code: 'not-found', message: 'Target user has no account record yet' };
        }
        return db.collection('users').doc(user.uid).get().then(function (doc) {
          return { targetDoc: targetDoc, selfDoc: doc };
        });
      })
      .then(function (pair) {
        var d = pair.selfDoc.exists ? pair.selfDoc.data() : {};
        var t = pair.targetDoc.data() || {};
        assertFriendRequestsShape(d, 'Your');
        assertFriendRequestsShape(t, 'Their');
        var friends = d.friends || [];
        var sent = asFriendIdList((d.friendRequests || {}).sent);
        var theirReceived = asFriendIdList((t.friendRequests || {}).received);
        var theirFriends = t.friends || [];
        if (friends.indexOf(toUid) > -1 || theirFriends.indexOf(user.uid) > -1) {
          if (btn) {
            btn.textContent = 'Already friends';
            btn.classList.add('added');
          }
          return { skipped: true };
        }
        if (sent.indexOf(toUid) > -1 || theirReceived.indexOf(user.uid) > -1) {
          if (btn) {
            btn.textContent = 'Request Sent';
            btn.classList.add('added');
          }
          return { skipped: true, userMessage: 'Friend request already pending.' };
        }
        return db
          .collection('users')
          .doc(user.uid)
          .update({
            'friendRequests.sent': firebase.firestore.FieldValue.arrayUnion(toUid)
          })
          .catch(function (err) {
            err.stage = 'yours';
            throw err;
          })
          .then(function () {
            return db.collection('users').doc(toUid).update({
              'friendRequests.received': firebase.firestore.FieldValue.arrayUnion(user.uid)
            });
          })
          .catch(function (err) {
            err.stage = 'their';
            throw err;
          })
          .then(function () {
            return writeFriendRequestActivity(
              toUid,
              user,
              'friend_request',
              (user.displayName || 'Someone') + ' sent you a friend request'
            );
          })
          .then(function () {
            return { skipped: false };
          });
      })
      .then(function (result) {
        if (result && result.skipped) {
          if (result.userMessage) showToast(result.userMessage);
          return;
        }
        if (btn) {
          btn.textContent = 'Request Sent ✓';
          btn.classList.add('added');
        }
        showToast('Friend request sent to ' + (toName || 'them'));
      })
      .catch(function (e) {
        if (btn) {
          btn.textContent = 'Add';
          btn.disabled = false;
        }
        showToast('Error: ' + friendRequestErrorMessage(e));
      });
  }

  function acceptFriendRequest(fromUid, fromName) {
    var user = auth && auth.currentUser;
    if (!user) return;
    var batch = db.batch();
    batch.update(db.collection('users').doc(user.uid), {
      friends: firebase.firestore.FieldValue.arrayUnion(fromUid),
      'friendRequests.received': firebase.firestore.FieldValue.arrayRemove(fromUid)
    });
    batch.update(db.collection('users').doc(fromUid), {
      friends: firebase.firestore.FieldValue.arrayUnion(user.uid),
      'friendRequests.sent': firebase.firestore.FieldValue.arrayRemove(user.uid)
    });
    batch
      .commit()
      .then(function () {
        return writeFriendRequestActivity(
          fromUid,
          user,
          'friend_accept',
          (user.displayName || 'Someone') + ' accepted your friend request'
        );
      })
      .then(function () {
        showToast('You and ' + (fromName || 'them') + ' are now friends!');
        if (typeof g.AnimusXp !== 'undefined') {
          g.AnimusXp.awardXp(db, user.uid, 'friend_accept');
        }
        loadNotifs(user.uid);
        loadFriends(user.uid);
      })
      .catch(function (e) {
        showToast('Error: ' + friendRequestErrorMessage(e));
      });
  }

  function declineFriendRequest(fromUid) {
    var user = auth && auth.currentUser;
    if (!user) return;
    db.collection('users')
      .doc(user.uid)
      .update({
        'friendRequests.received': firebase.firestore.FieldValue.arrayRemove(fromUid)
      })
      .then(function () {
        loadNotifs(user.uid);
      });
  }

  function notifCardHtml(r) {
    return (
      '<div class="notif-page-card">' +
      '<div class="notif-dot"></div>' +
      '<div class="notif-page-body">' +
      '<div class="notif-text"><strong>' +
      escapeHTML(r.name) +
      '</strong> sent you a friend request</div>' +
      '<div class="feed-actions">' +
      '<button type="button" class="btn-add-small btn-add-small--accept" data-uid="' +
      escapeHTML(r.uid) +
      '" data-name="' +
      escapeHTML(r.name) +
      '" onclick="AnimusSocial.acceptFriendRequest(this.dataset.uid,this.dataset.name)">Accept</button>' +
      '<button type="button" class="btn-add-small" data-uid="' +
      escapeHTML(r.uid) +
      '" onclick="AnimusSocial.declineFriendRequest(this.dataset.uid)">Decline</button>' +
      '</div></div></div>'
    );
  }

  function refreshNotifBadge(uid) {
    if (!db || !uid) return;
    var badge = document.getElementById('notifBadge');
    db.collection('users')
      .doc(uid)
      .get()
      .then(function (doc) {
        if (!doc.exists) return;
        var received = (doc.data().friendRequests || {}).received || [];
        var has = received.length > 0;
        if (badge) badge.style.display = has ? 'block' : 'none';
        if (typeof g.AnimusApp !== 'undefined') g.AnimusApp.syncMbnNotifBadge(has);
      });
  }

  function loadNotifsPage(uid) {
    if (!db) return;
    var list = document.getElementById('notifPageList');
    if (!list) return;
    db.collection('users')
      .doc(uid)
      .get()
      .then(function (doc) {
        if (!doc.exists) return;
        var received = (doc.data().friendRequests || {}).received || [];
        refreshNotifBadge(uid);
        if (!received.length) {
          if (g.AnimusTypeUi && g.AnimusTypeUi.emptyStateHtml) {
            list.innerHTML = g.AnimusTypeUi.emptyStateHtml(
              'requests',
              getProfileContext(),
              '<button type="button" class="empty-state-cta animus-pressable" onclick="AnimusSocial.openAddFriend()">Find people</button>'
            );
          } else {
            list.innerHTML =
              '<div class="notif-page-empty">You\'re all caught up. Friend requests will show up here.<br><a href="/activity">Find friends</a></div>';
          }
          return;
        }
        var promises = received.map(function (uid2) {
          return db
            .collection('users')
            .doc(uid2)
            .get()
            .then(function (d) {
              return d.exists ? { uid: uid2, name: d.data().displayName || 'Someone' } : null;
            });
        });
        Promise.all(promises).then(function (requesters) {
          var rows = requesters.filter(Boolean);
          if (!rows.length) {
            list.innerHTML =
              '<div class="notif-page-empty">You\'re all caught up.</div>';
            return;
          }
          list.innerHTML = rows.map(notifCardHtml).join('');
        });
      });
  }

  function loadNotifs(uid) {
    refreshNotifBadge(uid);
    var pageList = document.getElementById('notifPageList');
    if (pageList) loadNotifsPage(uid);
  }

  function bindModals() {
    var modal = document.getElementById('addFriendModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeAddFriend();
      });
    }
    var inp = document.getElementById('friendSearchInput');
    if (inp) {
      inp.addEventListener('input', function () {
        searchUsers(inp.value);
      });
    }
  }

  g.AnimusSocial = {
    init: init,
    openFriends: openFriends,
    openNotifs: openNotifs,
    toggleNotifs: toggleNotifs,
    refreshNotifBadge: refreshNotifBadge,
    loadNotifsPage: loadNotifsPage,
    openAddFriend: openAddFriend,
    closeAddFriend: closeAddFriend,
    loadFriends: loadFriends,
    loadActivity: loadActivity,
    loadNotifs: loadNotifs,
    searchUsers: searchUsers,
    sendFriendRequest: sendFriendRequest,
    acceptFriendRequest: acceptFriendRequest,
    declineFriendRequest: declineFriendRequest,
    showToast: showToast
  };

  g.openAddFriend = openAddFriend;
  g.closeAddFriend = closeAddFriend;
  g.toggleNotifPanel = toggleNotifs;
  g.acceptFriendRequest = acceptFriendRequest;
  g.declineFriendRequest = declineFriendRequest;
  g.sendFriendRequest = sendFriendRequest;
  g.searchUsers = searchUsers;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindModals);
  } else {
    bindModals();
  }
})(typeof window !== 'undefined' ? window : globalThis);
