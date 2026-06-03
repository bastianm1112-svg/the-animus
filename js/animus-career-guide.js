/**
 * Plus — AI Career & Lifestyle Guide (3/month, server-enforced).
 */
(function (g) {
  'use strict';

  var _auth = null;
  var _userData = null;
  var _snap = null;
  var _displayName = '';

  var escapeHTML = g.AnimusShared.escapeHTML;

  function toast(msg) {
    if (typeof g.showToast === 'function') g.showToast(msg);
    else alert(msg);
  }

  function profilePayload(snap) {
    snap = snap || {};
    return {
      mbti: snap.mbti,
      mbtiName: snap.mbtiName,
      ennType: snap.ennType,
      ennWing: snap.ennWing,
      ennTritype: snap.ennTritype,
      att: snap.att,
      phi: snap.phi,
      instStack: snap.instStack,
      polX: snap.polX,
      polY: snap.polY,
      tagline: snap.tagline
    };
  }

  function renderGuideHtml(guide, name) {
    var careers = (guide.careers || [])
      .map(function (c) {
        return (
          '<li><strong>' +
          escapeHTML(c.role) +
          '</strong> (' +
          escapeHTML(c.fit || 'explore') +
          ') — ' +
          escapeHTML(c.why) +
          '</li>'
        );
      })
      .join('');
    var lifestyle = (guide.lifestyle || [])
      .map(function (l) {
        return '<li><strong>' + escapeHTML(l.area) + ':</strong> ' + escapeHTML(l.guidance) + '</li>';
      })
      .join('');
    var strengths = (guide.strengths || []).map(function (s) {
      return '<li>' + escapeHTML(s) + '</li>';
    }).join('');
    var watchouts = (guide.watchouts || []).map(function (w) {
      return '<li>' + escapeHTML(w) + '</li>';
    }).join('');
    var steps = (guide.nextSteps || []).map(function (s) {
      return '<li>' + escapeHTML(s) + '</li>';
    }).join('');

    return (
      '<h1>' +
      escapeHTML(guide.title || 'Career & Lifestyle Guide') +
      '</h1>' +
      '<p style="color:#666;font-size:12px;margin-bottom:16px">Prepared for ' +
      escapeHTML(name) +
      ' · ANIMUS Plus · ' +
      new Date().toLocaleDateString() +
      '</p>' +
      '<p>' +
      escapeHTML(guide.summary || '') +
      '</p>' +
      '<h2>Recommended careers</h2><ul>' +
      careers +
      '</ul>' +
      '<h2>Lifestyle alignment</h2><ul>' +
      lifestyle +
      '</ul>' +
      '<h2>Strengths to leverage</h2><ul>' +
      strengths +
      '</ul>' +
      '<h2>Watch-outs</h2><ul>' +
      watchouts +
      '</ul>' +
      '<h2>Next steps</h2><ul>' +
      steps +
      '</ul>' +
      '<p style="margin-top:32px;font-size:11px;color:#999">For reflection only — not medical or financial advice.</p>'
    );
  }

  function openModal(html) {
    var modal = document.getElementById('careerGuideModal');
    var sheet = document.getElementById('careerGuideSheet');
    if (!modal || !sheet) return;
    sheet.innerHTML = html;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    var modal = document.getElementById('careerGuideModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function bindModal() {
    var modal = document.getElementById('careerGuideModal');
    if (!modal || modal._bound) return;
    modal._bound = true;
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    var closeBtn = document.getElementById('careerGuideClose');
    var printBtn = document.getElementById('careerGuidePrint');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (printBtn) {
      printBtn.addEventListener('click', function () {
        window.print();
      });
    }
  }

  function renderMount() {
    var root = document.getElementById('careerGuideMount');
    if (!root || !g.AnimusEntitlements) return;

    var plus = g.AnimusEntitlements.hasAnimusPlus(_userData);
    var remaining = g.AnimusEntitlements.getCareerPdfRemaining(_userData);
    var hasSnap = _snap && _snap.mbti;

    if (!plus) {
      root.innerHTML =
        '<div class="career-guide-card career-guide-upsell owner-only">' +
        '<div class="career-guide-card-title">Career & Lifestyle Guide</div>' +
        '<p class="career-guide-card-sub">AI-personalized PDF based on your full ANIMUS profile. Included with <a href="/shop">Animus Plus</a>.</p>' +
        '<a href="/shop" class="career-guide-btn" style="display:inline-block;text-align:center;text-decoration:none">View Plus</a>' +
        '</div>';
      return;
    }

    root.innerHTML =
      '<div class="career-guide-card owner-only">' +
      '<div class="career-guide-card-title">Career & Lifestyle Guide</div>' +
      '<p class="career-guide-card-sub">AI recommendations for careers and daily life from your assessment — save as PDF.</p>' +
      '<p class="career-guide-quota" id="careerGuideQuota">' +
      remaining +
      ' of ' +
      g.AnimusEntitlements.PLUS_CAREER_PDF_PER_MONTH +
      ' guides left this month</p>' +
      '<button type="button" class="career-guide-btn" id="careerGuideGenerate"' +
      (remaining > 0 && hasSnap ? '' : ' disabled') +
      '>' +
      (remaining > 0 ? (hasSnap ? 'Generate guide' : 'Complete assessment first') : 'Monthly limit reached') +
      '</button>' +
      '</div>';

    var btn = document.getElementById('careerGuideGenerate');
    if (btn && remaining > 0 && hasSnap) {
      btn.addEventListener('click', generateGuide);
    }
  }

  function generateGuide() {
    var user = _auth && _auth.currentUser;
    if (!user) {
      toast('Sign in required');
      return;
    }
    if (!g.AnimusEntitlements.canGenerateCareerPdf(_userData)) {
      toast('No guides remaining this month');
      return;
    }
    var btn = document.getElementById('careerGuideGenerate');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Generating…';
    }

    user
      .getIdToken()
      .then(function (token) {
        return fetch('/api/career-guide', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({
            profile: profilePayload(_snap),
            displayName: _displayName
          })
        });
      })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          throw new Error((res.data && res.data.error) || 'Generation failed');
        }
        if (!_userData.careerPdfUsage) _userData.careerPdfUsage = {};
        var mk =
          g.AnimusEntitlements && g.AnimusEntitlements.monthKey
            ? g.AnimusEntitlements.monthKey()
            : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
        _userData.careerPdfUsage.monthKey = mk;
        _userData.careerPdfUsage.count =
          g.AnimusEntitlements.PLUS_CAREER_PDF_PER_MONTH - (res.data.remaining || 0);
        openModal(renderGuideHtml(res.data.guide, _displayName));
        renderMount();
        toast('Guide ready — use Save as PDF to download');
      })
      .catch(function (e) {
        toast(e.message || 'Could not generate guide');
        renderMount();
      });
  }

  function mount(auth, userData, snap, displayName) {
    _auth = auth;
    _userData = userData || {};
    _snap = snap || {};
    _displayName = displayName || '';
    bindModal();
    renderMount();
  }

  g.AnimusCareerGuide = {
    mount: mount,
    closeModal: closeModal
  };
})(typeof window !== 'undefined' ? window : globalThis);
