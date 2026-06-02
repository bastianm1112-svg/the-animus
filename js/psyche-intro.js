/**
 * ANIMUS test page intro — isolated UI controller (loads before/after engine).
 * Buttons use direct handlers + no dependency on the large engine bundle parsing first.
 */
(function (g) {
  'use strict';

  var KEY_MODE = 'animus_test_mode';
  var KEY_PROGRESS = 'animus_test_progress';

  function el(id) {
    return document.getElementById(id);
  }

  function setMode(mode) {
    mode = mode === 'short' ? 'short' : 'full';
    try {
      localStorage.setItem(KEY_MODE, mode);
    } catch (e) {}

    var fullBtn = el('modeFull');
    var shortBtn = el('modeShort');
    if (fullBtn) {
      fullBtn.classList.toggle('active', mode === 'full');
      fullBtn.setAttribute('aria-pressed', mode === 'full' ? 'true' : 'false');
    }
    if (shortBtn) {
      shortBtn.classList.toggle('active', mode === 'short');
      shortBtn.setAttribute('aria-pressed', mode === 'short' ? 'true' : 'false');
    }
    var metaQ = el('metaQ');
    var metaMin = el('metaMin');
    if (metaQ) metaQ.textContent = mode === 'full' ? '280' : '100';
    if (metaMin) metaMin.textContent = mode === 'full' ? '~30' : '~12';
    g.__animusTestMode = mode;

    if (g.AnimusPsyche && typeof g.AnimusPsyche.setTestMode === 'function') {
      g.AnimusPsyche.setTestMode(mode);
    }
  }

  function loadMode() {
    var saved = 'full';
    if (g.AnimusShared && typeof g.AnimusShared.getSavedTestMode === 'function') {
      saved = g.AnimusShared.getSavedTestMode();
    } else {
      try {
        saved = localStorage.getItem(KEY_MODE) || 'full';
      } catch (e) {}
    }
    if (g.location.search.indexOf('mode=short') > -1) saved = 'short';
    setMode(saved === 'short' ? 'short' : 'full');
  }

  function showResume() {
    var wrap = el('resumeTestWrap');
    if (!wrap) return;
    try {
      var raw = sessionStorage.getItem(KEY_PROGRESS);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && data.answers && data.cur >= 1) wrap.style.display = 'block';
    } catch (e) {}
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
    if (g.AnimusPsyche && typeof g.AnimusPsyche.resumeTest === 'function') {
      g.AnimusPsyche.resumeTest();
      return;
    }
    startTest();
  }

  function bindIntro() {
    loadMode();
    showResume();

    var fullBtn = el('modeFull');
    var shortBtn = el('modeShort');
    var startBtn = el('startBtn');
    var resumeBtn = el('resumeTestBtn');

    if (fullBtn) {
      fullBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        setMode('full');
      };
    }
    if (shortBtn) {
      shortBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        setMode('short');
      };
    }
    if (startBtn) {
      startBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        startTest();
      };
    }
    if (resumeBtn) {
      resumeBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        resumeTest();
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
      loadMode();
      showResume();
    },
    onEngineReady: function () {
      loadMode();
      showResume();
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
