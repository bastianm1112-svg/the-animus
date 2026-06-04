/**
 * ANIMUS test page intro — mode tabs, resume, cross-mode continue.
 */
(function (g) {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function routeMode() {
    try {
      var p = new URLSearchParams(g.location.search);
      return p.get('mode');
    } catch (e) {
      return null;
    }
  }

  function setMainMode() {
    var mode = routeMode();
    if (mode === 'estimator') {
      try {
        localStorage.setItem('animus_test_mode', 'estimator');
      } catch (e) {}
      g.__animusTestMode = 'estimator';
      if (g.AnimusPsyche && typeof g.AnimusPsyche.setTestMode === 'function') {
        g.AnimusPsyche.setTestMode('estimator');
      }
      return;
    }
    if (mode === 'detailed') {
      try {
        localStorage.setItem('animus_test_mode', 'full');
      } catch (e) {}
      g.__animusTestMode = 'full';
      if (g.AnimusPsyche && typeof g.AnimusPsyche.setTestMode === 'function') {
        g.AnimusPsyche.setTestMode('full');
      }
      return;
    }
    var saved = g.AnimusPsyche && g.AnimusPsyche.loadSavedTestMode
      ? g.AnimusPsyche.loadSavedTestMode()
      : 'short';
    g.__animusTestMode = saved;
    if (g.AnimusPsyche && typeof g.AnimusPsyche.setTestMode === 'function') {
      g.AnimusPsyche.setTestMode(saved);
    }
  }

  function refreshIntro() {
    if (g.AnimusPsyche && typeof g.AnimusPsyche.refreshIntroModeUI === 'function') {
      g.AnimusPsyche.refreshIntroModeUI();
    }
  }

  function startTest() {
    if (g.AnimusPsyche && typeof g.AnimusPsyche.startTest === 'function') {
      g.AnimusPsyche.startTest();
      return;
    }
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (g.AnimusPsyche && typeof g.AnimusPsyche.startTest === 'function') {
        clearInterval(t);
        g.AnimusPsyche.startTest();
      } else if (tries > 80) {
        clearInterval(t);
        alert('The test is still loading. Please refresh the page and try again.');
      }
    }, 50);
  }

  function resumeTest() {
    function run() {
      if (g.AnimusPsyche && typeof g.AnimusPsyche.resumeTest === 'function') {
        var ok = g.AnimusPsyche.resumeTest();
        if (ok === false) return;
        return;
      }
      startTest();
    }
    if (g.AnimusPsyche && typeof g.AnimusPsyche.loadIntroEntitlements === 'function') {
      g.AnimusPsyche.loadIntroEntitlements(function () {
        run();
      });
      return;
    }
    run();
  }

  function bindModeTabs() {
    var tabs = el('testModeTabs');
    if (!tabs) return;
    tabs.querySelectorAll('.intro-mode-btn').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = tab.getAttribute('data-mode');
        if (!mode || !g.AnimusPsyche) return;
        if (mode === 'full') {
          if (g.AnimusPsyche.canSelectTestMode && !g.AnimusPsyche.canSelectTestMode('full')) {
            window.location.href = '/shop';
            return;
          }
          g.AnimusPsyche.setTestMode('full');
        } else {
          g.AnimusPsyche.setTestMode('short');
        }
        refreshIntro();
      });
    });
  }

  function bindIntro() {
    setMainMode();
    bindModeTabs();
    refreshIntro();

    var startBtn = el('startBtn');
    var resumeBtn = el('resumeTestBtn');
    var otherBtn = el('otherModeResumeBtn');
    if (startBtn) {
      startBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        startTest();
      };
    }
    if (resumeBtn) {
      resumeBtn.type = 'button';
      resumeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        resumeTest();
      });
    }
    if (otherBtn) {
      otherBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!g.AnimusPsyche || !g.AnimusPsyche.switchTestMode) return;
        var current = g.AnimusPsyche.loadSavedTestMode
          ? g.AnimusPsyche.loadSavedTestMode()
          : 'short';
        var target = current === 'full' ? 'short' : 'full';
        g.AnimusPsyche.switchTestMode(target, true);
      };
    }

    var intro = el('intro');
    if (intro) {
      intro.style.pointerEvents = 'auto';
      intro.style.isolation = 'isolate';
    }
  }

  g.AnimusIntro = {
    refresh: function () {
      setMainMode();
      refreshIntro();
    },
    onEngineReady: function () {
      setMainMode();
      if (g.AnimusPsyche && typeof g.AnimusPsyche.loadIntroEntitlements === 'function') {
        g.AnimusPsyche.loadIntroEntitlements(function () {
          refreshIntro();
        });
      } else {
        refreshIntro();
      }
    }
  };

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(bindIntro);
})(window);
