/**
 * Shared app navbar markup (optional inject). Most pages inline the same structure.
 */
(function (g) {
  'use strict';

  var SVG_HOME =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  var SVG_SETTINGS =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  var SVG_FRIENDS =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  var SVG_COMPARE =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>';
  var SVG_TYPES =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 10h16M4 14h8M4 18h8"/></svg>';
  var SVG_TEST =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var SVG_BELL =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  var SVG_THEME =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var SVG_MENU =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';

  function ac(active, key) {
    return active === key ? ' active' : '';
  }

  function buildNavbar(active) {
    active = active || '';
    return (
      '<nav class="navbar">' +
      '<a href="/" class="nav-logo">ANI<span>MUS</span></a>' +
      '<div class="nav-items">' +
      '<a href="/" class="nav-item' +
      ac(active, 'home') +
      '">' +
      SVG_HOME +
      ' <span data-en="Home" data-es="Inicio">Home</span></a>' +
      '<a href="/settings" class="nav-item' +
      ac(active, 'settings') +
      '">' +
      SVG_SETTINGS +
      ' <span data-en="Settings" data-es="Ajustes">Settings</span></a>' +
      '<a href="/friends" class="nav-item' +
      ac(active, 'friends') +
      '">' +
      SVG_FRIENDS +
      ' <span data-en="Friends" data-es="Amigos">Friends</span></a>' +
      '<a href="/notifications" class="nav-item nav-item-notif' +
      ac(active, 'notifications') +
      '" id="navNotifBtn">' +
      SVG_BELL +
      ' <span data-en="Notifications" data-es="Notificaciones">Notifications</span><div class="notif-badge" id="notifBadge"></div></a>' +
      '<a href="/test" class="nav-item' +
      ac(active, 'test') +
      '">' +
      SVG_TEST +
      ' <span data-en="Take Test" data-es="Hacer test">Take Test</span></a>' +
      '<a href="/compare" class="nav-item' +
      ac(active, 'compare') +
      '">' +
      SVG_COMPARE +
      ' <span data-en="Compare" data-es="Comparar">Compare</span></a>' +
      '<a href="/types" class="nav-item' +
      ac(active, 'types') +
      '">' +
      SVG_TYPES +
      ' <span data-en="Types" data-es="Tipos">Types</span></a>' +
      '</div>' +
      '<div class="nav-right">' +
      '<button type="button" class="theme-toggle-btn" id="themeToggleBtn" onclick="toggleThemeGlobal()" title="Toggle theme">' +
      SVG_THEME +
      '</button>' +
      '<button type="button" class="nav-hamburger" id="navHamburger" onclick="toggleMobileMenu()" aria-label="Toggle navigation">' +
      SVG_MENU +
      '</button>' +
      '<a href="/profile" class="nav-avatar" id="navAvatar">?</a>' +
      '</div></nav>' +
      '<div class="nav-mobile-menu" id="navMobileMenu">' +
      '<a href="/" class="nav-mobile-item' +
      ac(active, 'home') +
      '">Home</a>' +
      '<a href="/settings" class="nav-mobile-item' +
      ac(active, 'settings') +
      '">Settings</a>' +
      '<a href="/friends" class="nav-mobile-item' +
      ac(active, 'friends') +
      '">Friends</a>' +
      '<a href="/notifications" class="nav-mobile-item' +
      ac(active, 'notifications') +
      '">Notifications</a>' +
      '<a href="/test" class="nav-mobile-item' +
      ac(active, 'test') +
      '">Take Test</a>' +
      '<a href="/compare" class="nav-mobile-item' +
      ac(active, 'compare') +
      '">Compare</a>' +
      '<a href="/types" class="nav-mobile-item' +
      ac(active, 'types') +
      '">Types</a>' +
      '</div>'
    );
  }

  function buildBottomNav(active) {
    var svgFriends =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    return (
      '<nav class="mobile-bottom-nav" aria-label="Mobile navigation">' +
      '<a href="/" class="mbn-item' +
      ac(active, 'home') +
      '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Home</a>' +
      '<a href="/friends" class="mbn-item' +
      ac(active, 'friends') +
      '">' +
      svgFriends +
      'Friends</a>' +
      '<a href="/compare" class="mbn-item' +
      ac(active, 'compare') +
      '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>Compare</a>' +
      '<a href="/test" class="mbn-item' +
      ac(active, 'test') +
      '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Test</a>' +
      '<a href="/settings" class="mbn-item' +
      ac(active, 'settings') +
      '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>More</a>' +
      '</nav>'
    );
  }

  function applyNavLang() {
    if (g.AnimusI18n && g.AnimusI18n.applyDomI18n) {
      var lang = g.AnimusShared && g.AnimusShared.getResolvedLang
        ? g.AnimusShared.getResolvedLang()
        : 'en';
      g.AnimusI18n.applyDomI18n(document, lang);
    }
  }

  function mountTop(rootId, active) {
    var root = document.getElementById(rootId);
    if (root) root.innerHTML = buildNavbar(active);
    applyNavLang();
  }

  function mountBottom(rootId, active) {
    var root = document.getElementById(rootId);
    if (root) root.innerHTML = buildBottomNav(active);
    applyNavLang();
  }

  function mount(rootId, active) {
    mountTop(rootId, active);
  }

  g.AnimusNav = {
    buildNavbar: buildNavbar,
    buildBottomNav: buildBottomNav,
    mountTop: mountTop,
    mountBottom: mountBottom,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
