/**
 * ANIMUS test page intro — main test only (100-question short mode).
 */
(function (g) {
  'use strict';

  var KEY_PROGRESS = 'animus_test_progress';

  function el(id) {
    return document.getElementById(id);
  }

  function setMainMode() {
    try {
      localStorage.setItem('animus_test_mode', 'short');
    } catch (e) {}
    g.__animusTestMode = 'short';
    if (g.AnimusPsyche && typeof g.AnimusPsyche.setTestMode === 'function') {
      g.AnimusPsyche.setTestMode('short');
    }
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
    setMainMode();
    showResume();

    var startBtn = el('startBtn');
    var resumeBtn = el('resumeTestBtn');
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
      setMainMode();
      showResume();
    },
    onEngineReady: function () {
      setMainMode();
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
