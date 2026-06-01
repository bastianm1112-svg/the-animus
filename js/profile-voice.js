/* Profile page copy: YOU (owner) vs they/them (viewing someone else) */
(function (g) {
  'use strict';

  function narrativeForViewer(text, isOwner, displayName) {
    if (!text || isOwner) return text || '';
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
      'cogNarrativePlaceholder': isOwner ? 'Complete the assessment to see your cognitive analysis.' : 'Complete the assessment to see their cognitive analysis.',
      'phiNarrativePlaceholder': isOwner ? 'Complete the assessment to see your philosophical analysis.' : 'Complete the assessment to see their philosophical analysis.',
      'polNarrativePlaceholder': isOwner ? 'Complete the assessment to see your political analysis.' : 'Complete the assessment to see their political analysis.',
      'socialPlaceholder': isOwner ? 'Complete the assessment to see your social analysis.' : 'Complete the assessment to see their social analysis.'
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

    var compareBtn = document.querySelector('a[href="/compare"]');
    if (compareBtn && !isOwner) {
      compareBtn.textContent = '⇄ Compare with them';
    }

    function narr(t) { return narrativeForViewer(t, isOwner, name); }

    return { narrativeForViewer: narr, subj: subj, they: they, their: their, Your: Your, You: You, name: name };
  }

  g.AnimusProfileVoice = {
    applyProfileVoice: applyProfileVoice,
    narrativeForViewer: narrativeForViewer
  };
})(typeof window !== 'undefined' ? window : globalThis);
