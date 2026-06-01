/* Profile page copy: YOU (owner) vs they/them (viewing someone else) */
(function (g) {
  'use strict';

  function narrativeForViewer(text, isOwner, displayName) {
    if (!text) return '';
    if (typeof g.AnimusShared !== 'undefined' && g.AnimusShared.sanitizePlainText) {
      text = g.AnimusShared.sanitizePlainText(text, 2000);
    }
    if (isOwner) return text;
    var name = (displayName || '').trim();
    var out = String(text)
      .replace(/\bYou're\b/g, "They're")
      .replace(/\byou're\b/g, "they're")
      .replace(/\bYou are\b/g, 'They are')
      .replace(/\byou are\b/g, 'they are')
      .replace(/\bYou\b/g, 'They')
      .replace(/\byou\b/g, 'they')
      .replace(/\bYour\b/g, 'Their')
      .replace(/\byour\b/g, 'their')
      .replace(/\bYours\b/g, 'Theirs')
      .replace(/\byours\b/g, 'theirs')
      .replace(/\b Yourself\b/g, ' Themself')
      .replace(/\b yourself\b/g, ' themself');
    if (name) {
      out = out.replace(/\bThis person\b/gi, name);
      out = out.replace(/\bthis person\b/g, name);
    }
    return out;
  }

  function applyProfileVoice(isOwner, displayName) {
    var name = (displayName || '').trim() || 'This person';
    var subj = isOwner ? 'YOU' : name;
    var they = isOwner ? 'you' : 'they';
    var their = isOwner ? 'your' : 'their';
    var Your = isOwner ? 'Your' : 'Their';
    var You = isOwner ? 'You' : 'They';

    var banner = document.getElementById('profileViewBanner');
    if (banner) {
      if (isOwner) {
        banner.style.display = 'none';
        banner.textContent = '';
      } else {
        banner.style.display = 'block';
        banner.textContent = 'Viewing ' + name + "'s profile — results describe them, not you.";
      }
    }

    var map = {
      'profileTagline': isOwner ? 'Complete the assessment to generate your profile narrative.' : 'This person has not completed an assessment yet.',
      'aloneNarrative': isOwner ? 'Complete the assessment to see this section.' : 'They have not completed an assessment for this section.',
      'socialNarrative': isOwner ? 'Complete the assessment to see this section.' : 'They have not completed an assessment for this section.',
      'shadowNarrative': isOwner ? 'Complete the assessment to see this section.' : 'They have not completed an assessment for this section.',
      'cogNarrativePlaceholder': isOwner ? 'Complete the assessment to see your cognitive analysis.' : 'Cognitive analysis will appear after they complete the assessment.',
      'phiNarrativePlaceholder': isOwner ? 'Complete the assessment to see your philosophical analysis.' : 'Philosophical analysis will appear after they complete the assessment.',
      'polNarrativePlaceholder': isOwner ? 'Complete the assessment to see your political analysis.' : 'Political analysis will appear after they complete the assessment.',
      'socialPlaceholder': isOwner ? 'Complete the assessment to see your social analysis.' : 'Social analysis will appear after they complete the assessment.'
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.dataset.filled) el.textContent = map[id];
    });

    document.querySelectorAll('[data-voice-title]').forEach(function (el) {
      var youT = el.getAttribute('data-voice-title-you');
      var theyT = el.getAttribute('data-voice-title-they');
      if (youT && theyT) el.textContent = isOwner ? youT : theyT;
    });

    document.querySelectorAll('[data-voice-you]').forEach(function (el) {
      if (el.dataset.dynamicFilled) return;
      var theyText = el.getAttribute('data-voice-they');
      var youText = el.getAttribute('data-voice-you');
      if (!youText && !theyText) return;
      el.textContent = (isOwner ? youText : theyText || youText).replace(/%name%/g, name);
    });

    document.querySelectorAll('[data-voice-html-you]').forEach(function (el) {
      if (el.dataset.dynamicFilled) return;
      var theyHtml = el.getAttribute('data-voice-html-they');
      var youHtml = el.getAttribute('data-voice-html-you');
      if (!youHtml && !theyHtml) return;
      el.innerHTML = (isOwner ? youHtml : theyHtml || youHtml).replace(/%name%/g, escapeHTML(name));
    });

    var assessMeta = document.getElementById('assessMetaText');
    if (assessMeta) {
      assessMeta.textContent = isOwner ? 'assessments taken' : 'assessments completed';
    }

    var retakeBtn = document.querySelector('a[href="/test"].btn-primary-profile');
    if (retakeBtn) retakeBtn.style.display = isOwner ? '' : 'none';
    var editBtn = document.querySelector('.hero-actions button[onclick="editBio()"]');
    if (editBtn) editBtn.style.display = isOwner ? '' : 'none';

    document.querySelectorAll('.profile-actions-card a[href="/compare"]').forEach(function (a) {
      if (!isOwner) a.textContent = '⇄ Compare with them';
      else a.textContent = '⇄ Compare with someone';
    });

    function narr(t) { return narrativeForViewer(t, isOwner, name); }

    return { narrativeForViewer: narr, subj: subj, they: they, their: their, Your: Your, You: You, name: name, isOwner: isOwner };
  }

  function escapeHTML(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  g.AnimusProfileVoice = {
    applyProfileVoice: applyProfileVoice,
    narrativeForViewer: narrativeForViewer
  };
})(typeof window !== 'undefined' ? window : globalThis);
