/**
 * Type accents & personality-aware UI copy — no trademarked instrument names in user-facing text.
 */
(function (g) {
  'use strict';

  function normalizeTypeCode(code) {
    return String(code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
  }

  function quadrantFor(code) {
    var t = normalizeTypeCode(code);
    if (t.length < 4) return 'default';
    var n = t.charAt(1) === 'N';
    var s = t.charAt(2);
    var j = t.charAt(3);
    if (n && s === 'T') return 'nt';
    if (n && s === 'F') return 'nf';
    if (!n && j === 'J') return 'sj';
    if (!n && j === 'P') return 'sp';
    return 'default';
  }

  function accentClassFor(code) {
    var q = quadrantFor(code);
    return q === 'default' ? 'type-accent-default' : 'type-accent-' + q;
  }

  function applyAccent(el, code) {
    if (!el) return;
    el.classList.remove(
      'type-accent-nt',
      'type-accent-nf',
      'type-accent-sj',
      'type-accent-sp',
      'type-accent-default'
    );
    el.classList.add(accentClassFor(code));
  }

  var EMPTY_FRIENDS = {
    nt: 'You think in systems — add someone who runs on instinct and watch where your maps diverge.',
    nf: 'You read the room deeply — compare with someone blunt and see what you each miss.',
    sj: 'You build stability — add someone spontaneous to see how you complement each other.',
    sp: 'You move in the moment — add a planner and discover where pace collides.',
    default:
      'Contrast sharpens profiles — add someone whose rhythm differs from yours and compare.'
  };

  var EMPTY_FEED = {
    nt: 'When friends join, their moves show up here — useful data for your next comparison.',
    nf: 'Friend activity lands here — a quiet feed until your circle starts checking in.',
    sj: 'Updates from friends appear here once your network is active.',
    sp: 'Your social pulse shows here — add friends to see what is happening.',
    default: 'Friend updates will stream here once you connect with someone on ANIMUS.'
  };

  var EMPTY_ESTIMATIONS = {
    nt: 'Build a behavioral read on someone from observed patterns — no account link required.',
    nf: 'Capture how someone actually behaves in the wild — separate from your friends list.',
    sj: 'Log what you have seen someone do consistently — estimate their profile from evidence.',
    sp: 'Guess someone\'s type from real moments you witnessed — saved on its own.',
    default:
      'Estimate someone from what you have actually seen them do — kept apart from friends.'
  };

  var EMPTY_REQUESTS = 'No pending requests — when someone finds you, they appear here.';

  function emptyCopy(kind, profile) {
    var code = profile && profile.mbti ? profile.mbti : '';
    var q = quadrantFor(code);
    if (kind === 'friends') return EMPTY_FRIENDS[q] || EMPTY_FRIENDS.default;
    if (kind === 'feed') return EMPTY_FEED[q] || EMPTY_FEED.default;
    if (kind === 'estimations') return EMPTY_ESTIMATIONS[q] || EMPTY_ESTIMATIONS.default;
    if (kind === 'requests') return EMPTY_REQUESTS;
    return EMPTY_FRIENDS.default;
  }

  function emptyStateHtml(kind, profile, ctaHtml) {
    var q = quadrantFor(profile && profile.mbti);
    return (
      '<div class="empty-state empty-state--personality empty-state--' +
      q +
      '">' +
      '<p class="empty-state-text">' +
      emptyCopy(kind, profile) +
      '</p>' +
      (ctaHtml || '') +
      '</div>'
    );
  }

  function formatEnneagram(profile) {
    if (!profile || !profile.ennType) return '';
    var w = profile.ennWing != null ? profile.ennWing : '';
    return 'E' + profile.ennType + (w !== '' ? 'w' + w : '');
  }

  function profileSnapshotHtml(profile, username) {
    if (!profile || !profile.mbti) return '';
    var code = normalizeTypeCode(profile.mbti);
    var enn = formatEnneagram(profile);
    var tagline = String(profile.tagline || profile.mbtiName || '').trim();
    if (tagline.length > 120) tagline = tagline.slice(0, 119) + '…';
    var href =
      username && typeof g.AnimusShared !== 'undefined'
        ? g.AnimusShared.profileHrefForUser(username)
        : '/profile';
    var meta = enn ? code + ' · ' + enn : code;
    return (
      '<a href="' +
      href +
      '" class="home-profile-snapshot ' +
      accentClassFor(code) +
      ' animus-reveal">' +
      '<div class="home-profile-snapshot-accent" aria-hidden="true"></div>' +
      '<div class="home-profile-snapshot-body">' +
      '<span class="home-profile-snapshot-label">Your profile</span>' +
      '<span class="home-profile-snapshot-type">' +
      meta +
      '</span>' +
      (tagline
        ? '<p class="home-profile-snapshot-tagline">' + g.AnimusShared.escapeHTML(tagline) + '</p>'
        : '<p class="home-profile-snapshot-tagline home-profile-snapshot-tagline--muted">View your full dimensional map</p>') +
      '</div>' +
      '<span class="home-profile-snapshot-arrow" aria-hidden="true">→</span>' +
      '</a>'
    );
  }

  g.AnimusTypeUi = {
    normalizeTypeCode: normalizeTypeCode,
    quadrantFor: quadrantFor,
    accentClassFor: accentClassFor,
    applyAccent: applyAccent,
    emptyCopy: emptyCopy,
    emptyStateHtml: emptyStateHtml,
    formatEnneagram: formatEnneagram,
    profileSnapshotHtml: profileSnapshotHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
