/**
 * Rich "what this means for you" profile copy — used by ProfileNarratives fallback
 * and whenever refreshSnapshotNarratives rebuilds text (including admin-locked profiles).
 */
(function (g) {
  'use strict';

  var ENN_CORE = {
    '1': {
      name: 'The Reformer',
      fear: 'being corrupt, defective, or morally wrong',
      desire: 'to be good, balanced, and have integrity',
      drive: 'an inner critic that constantly measures reality against an ideal standard'
    },
    '2': {
      name: 'The Helper',
      fear: 'being unwanted or unloved for who you are',
      desire: 'to feel needed and appreciated',
      drive: 'attunement to others\' needs — often before your own register on the radar'
    },
    '3': {
      name: 'The Achiever',
      fear: 'being worthless without success or admiration',
      desire: 'to feel valuable and worthwhile through accomplishment',
      drive: 'efficiency in self-presentation and a focus on goals that earn recognition'
    },
    '4': {
      name: 'The Individualist',
      fear: 'having no identity or significance',
      desire: 'to find yourself and be understood in your depth',
      drive: 'emotional honesty and a pull toward what feels authentic, even when painful'
    },
    '5': {
      name: 'The Investigator',
      fear: 'being useless, incapable, or overwhelmed',
      desire: 'to be competent and understand the world',
      drive: 'conservation of energy and attention — you gather knowledge before you spend yourself'
    },
    '6': {
      name: 'The Loyalist',
      fear: 'being without support or guidance',
      desire: 'to have security and trustworthy structure',
      drive: 'scanning for risk and building alliances with people and systems you can rely on'
    },
    '7': {
      name: 'The Enthusiast',
      fear: 'being trapped in pain or deprivation',
      desire: 'to be satisfied and experience life fully',
      drive: 'rapid reframing toward possibility — your mind moves away from limitation toward options'
    },
    '8': {
      name: 'The Challenger',
      fear: 'being controlled or violated',
      desire: 'to protect yourself and determine your own path',
      drive: 'directness about power — you test strength and resist being managed'
    },
    '9': {
      name: 'The Peacemaker',
      fear: 'loss of connection and fragmentation',
      desire: 'to have inner stability and peace of mind',
      drive: 'merging with comfort and harmony — conflict feels costly, so you often accommodate first'
    }
  };

  var WING_FLAVOR = {
    '1': { '9': 'softens perfectionism with patience', '2': 'adds warmth and service to high standards' },
    '2': { '1': 'adds structure and principle to helping', '3': 'adds ambition and polish to generosity' },
    '3': { '2': 'adds relational warmth beneath achievement', '4': 'adds depth and aesthetic sensitivity' },
    '4': { '3': 'adds drive to express uniqueness publicly', '5': 'adds intellectual distance and observation' },
    '5': { '4': 'adds emotional intensity to analysis', '6': 'adds loyalty anxiety to withdrawal' },
    '6': { '5': 'adds analytical independence to loyalty', '7': 'adds optimism and distraction from fear' },
    '7': { '6': 'adds responsibility and doubt beneath enthusiasm', '8': 'adds assertiveness and intensity' },
    '8': { '7': 'adds charm and strategic playfulness', '9': 'adds calm and mediation to force' },
    '9': { '8': 'adds quiet assertiveness when pushed', '1': 'adds principled structure to peace-seeking' }
  };

  var PHI_DEPTH = {
    PH_STO: {
      label: 'Stoic',
      lens: 'virtue, discipline, and what is within your control',
      means: 'You tend to treat character as the real currency of life. External outcomes matter, but they do not get to define your inner standing. When pressure rises, your reflex is often to narrow focus: what can I do well right now, regardless of applause or chaos?',
      daily: 'In decisions, you may ask whether you are acting from principle or from impulse. Setbacks become material for practice rather than verdicts on your worth. Others may read you as steady or emotionally contained — not because you feel less, but because you prioritize response over reaction.',
      tension: 'The risk is moral rigidity or emotional distance — holding standards so high that warmth, rest, or honest vulnerability feel like weakness.'
    },
    PH_EPI: {
      label: 'Epicurean',
      lens: 'well-being, measured pleasure, and the reduction of unnecessary suffering',
      means: 'You evaluate ideas and commitments partly by whether they increase a life that feels livable. Not shallow hedonism — more a refusal to worship suffering or status for their own sake.',
      daily: 'You may prefer experiences and relationships that feel nourishing, and you can be skeptical of doctrines that demand misery as proof of seriousness. Joy, friendship, and simple goods carry real philosophical weight for you.',
      tension: 'The risk is avoiding necessary difficulty — postponing hard conversations or long projects because comfort is easier to optimize than meaning.'
    },
    PH_KAN: {
      label: 'Kantian',
      lens: 'duty, universal moral law, and respect for persons',
      means: 'You feel the pull of rules that should apply to everyone, not just when convenient. People are ends, not tools — and that idea shapes how you think about fairness, promises, and rights.',
      daily: 'You may judge actions by whether you could will them as a rule for all rational agents, not only by outcomes. Integrity often means doing the right thing when nobody applauds it.',
      tension: 'The risk is rigidity — moral formulas that ignore context, emotion, or the messy human cost of pure principle.'
    },
    PH_ARI: {
      label: 'Aristotelian',
      lens: 'virtue as habit, flourishing, and the mean between extremes',
      means: 'You see character as something built through repeated choices in real communities — not abstract purity in isolation. The good life is practiced, not only theorized.',
      daily: 'You may care about role models, mentorship, and whether your habits actually make you wiser, braver, or more just over time. Balance matters: courage between cowardice and recklessness, generosity between stinginess and waste.',
      tension: 'The risk is conservatism — treating tradition as wisdom by default, or judging people who cannot access the same stable conditions for "flourishing."'
    },
    PH_NIE: {
      label: 'Nietzschean',
      lens: 'power, self-overcoming, and the creation of your own values',
      means: 'You are suspicious of comfortable moral systems that flatten excellence or excuse mediocrity. Life, for you, often involves tension, ambition, and the demand to become more than you were.',
      daily: 'You may respect people who build themselves under pressure and distrust moralities that feel like herd comfort. Art, intensity, and honest confrontation with weakness can matter more than polite consensus.',
      tension: 'The risk is contempt — reading vulnerability as failure, or justifying dominance as "strength" when it is only fear of being ordinary.'
    },
    PH_EXI: {
      label: 'Existentialist',
      lens: 'freedom, responsibility, and meaning created under uncertainty',
      means: 'You take seriously that there is no guaranteed script — choices are real, consequences are yours, and authenticity matters more than performed roles.',
      daily: 'You may feel alive in moments of decision: career pivots, honest love, creative risk. Bad faith — living as if you had no choice — irritates you, whether in others or in yourself.',
      tension: 'The risk is paralysis or drama — either endless searching for the "true" self, or treating every ordinary commitment as inauthentic.'
    },
    PH_PRA: {
      label: 'Pragmatist',
      lens: 'what works, what can be tested, and what improves life in practice',
      means: 'Truth and value, for you, prove themselves in consequences. Ideas are tools; ideologies that ignore outcomes feel hollow.',
      daily: 'You may prefer experiments, iteration, and policies that can be revised when reality pushes back. Disagreement is less about sacred labels and more about measurable difference.',
      tension: 'The risk is short-termism — calling something "practical" when it only avoids deeper moral questions or long-range harm.'
    },
    PH_SKE: {
      label: 'Skeptic',
      lens: 'doubt, evidence, and the limits of certainty',
      means: 'You hold claims lightly until they earn their weight. Authority, tradition, and confidence without warrant all trigger the same question: how do you know?',
      daily: 'You may delay judgment, ask for sources, and feel more comfortable with revision than with dogma. That can make you a valuable critic — and a frustrating partner to people who need closure.',
      tension: 'The risk is cynicism — treating all commitment as foolish, or using doubt to avoid ever standing for something costly.'
    }
  };

  var ATT_DEPTH = {
    AT_SEC: {
      label: 'Secure',
      means: 'You can move toward closeness without constant proof that you will not be abandoned, and you can tolerate distance without assuming rejection. Needs and boundaries are negotiable rather than catastrophic.',
      relation: 'In conflict you are more likely to repair than to punish or disappear. Trust builds slowly but does not require performance — you assume goodwill until evidence says otherwise.'
    },
    AT_ANX: {
      label: 'Anxious',
      means: 'Connection matters intensely, and uncertainty about where you stand can activate vigilance — reading tone, timing, and distance for signs of withdrawal.',
      relation: 'You may seek reassurance or merge quickly when afraid of loss. The work is not to need less, but to separate real signals from stories fear tells when someone is simply busy or reserved.'
    },
    AT_AVO: {
      label: 'Avoidant',
      means: 'Autonomy and self-sufficiency are not just preferences — they can feel like survival. Intimacy may register as obligation or loss of control before it registers as warmth.',
      relation: 'You often solve stress by withdrawing capacity rather than asking for help. Partners may experience you as distant while you experience yourself as simply protecting bandwidth.'
    },
    AT_DIS: {
      label: 'Dismissive-avoidant',
      means: 'You may intellectualize or minimize emotional need — in yourself and sometimes in others. Vulnerability can feel inefficient or dangerous compared to competence and independence.',
      relation: 'Closeness is possible, but it usually requires safety over time: consistency without pressure, and respect for your pace rather than dramatic pursuit.'
    }
  };

  var POL_QUAD_DEPTH = {
    'lib-right': {
      title: 'Libertarian-right',
      economics: 'You lean toward markets, property rights, and skepticism of large-scale economic planning. Prosperity, in your frame, usually comes from voluntary exchange and innovation rather than redistribution alone.',
      social: 'On the social axis you resist state control over lifestyle, speech, and personal choice. Authority should be limited even when it promises order.',
      forYou: 'This combination often means you want both economic freedom and personal freedom — you may distrust bureaucracies on principle, not only when they inconvenience you.',
      blind: 'Market solutions can fail for public goods, monopolies, or people without starting capital. Personal liberty can be uneven if power concentrates in private hands instead of the state.'
    },
    'auth-right': {
      title: 'Conservative / authoritarian-right',
      economics: 'You favor market economies with strong institutions — property, contract, and often national or cultural continuity alongside growth.',
      social: 'You accept more social authority: law, tradition, or security structures when disorder feels costly.',
      forYou: 'Stability and hierarchy may feel like prerequisites for prosperity, not enemies of it. Change is fine when it strengthens the whole, not when it dissolves shared norms.',
      blind: 'Order can become excuse for cruelty; markets can hollow out communities while symbols of tradition remain.'
    },
    'lib-left': {
      title: 'Libertarian-left',
      economics: 'You combine economic egalitarianism with deep civil libertarianism — skeptical of both corporate concentration and state overreach.',
      social: 'Personal freedom and participatory structures matter; authority must justify itself continuously.',
      forYou: 'You may feel politically homeless in mainstream parties: too anti-corporate for the right, too anti-bureaucratic for the authoritarian left.',
      blind: 'Local mutual aid does not always scale; anti-state reflexes can stall reforms that protect vulnerable groups.'
    },
    'auth-left': {
      title: 'Authoritarian-left',
      economics: 'You prioritize collective economic management — unions, welfare states, or stronger public ownership — to reduce inequality.',
      social: 'You accept institutional authority when it enforces fairness or prevents exploitation.',
      forYou: 'Justice is systemic for you: individual charity cannot replace structures that distribute power more evenly.',
      blind: 'Central planning and moral certainty can crush dissent and innovation; good intentions do not guarantee good outcomes.'
    }
  };

  function phiKey(phi) {
    var p = String(phi || 'PH_PRA').toUpperCase();
    return PHI_DEPTH[p] ? p : 'PH_PRA';
  }

  function buildEnnNarrative(mbti, enn) {
    var type = String(enn.type || '9').replace(/\D/g, '') || '9';
    var wing = String(enn.wing || '1').replace(/\D/g, '') || '1';
    var core = ENN_CORE[type] || ENN_CORE['9'];
    var wingNote = (WING_FLAVOR[type] && WING_FLAVOR[type][wing]) || 'adds a secondary color to how your core motivation shows up';

    var p1 =
      'Your Enneagram ' +
      type +
      'w' +
      wing +
      ' (' +
      core.name +
      ') is not just a label — it names a recurring pattern in what you move toward and what you move away from. Core fear: ' +
      core.fear +
      '. Core desire: ' +
      core.desire +
      '. In daily life this often feels like ' +
      core.drive +
      '.';

    var p2 =
      'The ' +
      wing +
      ' wing ' +
      wingNote +
      '. Together with ' +
      mbti +
      ', this explains why you can look like a different person under stress versus when you feel secure: the same type, different bandwidth.';

    var p3 = '';
    if (enn.tritype) {
      p3 =
        '\n\nYour tritype ' +
        enn.tritype +
        ' maps how your gut (8-9-1), heart (2-3-4), and head (5-6-7) centers each vote on decisions. When inner conflict hits, it is often because these three voices want different things at once — not because you are "inconsistent."';
    }

    var mbtiBridge =
      '\n\nWith ' +
      mbti +
      ', this motivation usually shows up through your cognitive style: the same Enneagram type can look strategic, artistic, or administrative depending on which functions lead. Your results tie the motivation layer (' +
      type +
      'w' +
      wing +
      ') to the processing layer (' +
      mbti +
      ') so the profile describes you, not a generic type brochure.';

    return p1 + '\n\n' + p2 + p3 + mbtiBridge;
  }

  function buildPhiNarrative(phi, mbti, enn) {
    var pk = phiKey(phi);
    var d = PHI_DEPTH[pk];
    var ennLabel = (enn.type || '9') + 'w' + (enn.wing || '1');
    return (
      'Your philosophical lean — ' +
      d.label +
      ' — is a map of how you decide what counts as a good life, not a trivia tag.\n\n' +
      'What this orientation means: you gravitate toward ' +
      d.lens +
      '. ' +
      d.means +
      '\n\n' +
      'What it looks like for you as ' +
      mbti +
      ' (' +
      ennLabel +
      '): ' +
      d.daily +
      '\n\n' +
      'Where to watch yourself: ' +
      d.tension
    );
  }

  function buildAttNarrative(att, mbti, enn) {
    var key = ATT_DEPTH[att] ? att : 'AT_SEC';
    var d = ATT_DEPTH[key];
    var ennLabel = (enn.type || '9') + 'w' + (enn.wing || '1');
    return (
      'Attachment style (' +
      d.label +
      ') describes the default program you run in close relationships — often before conscious choice.\n\n' +
      'What this means for you: ' +
      d.means +
      '\n\n' +
      'In practice with ' +
      mbti +
      ' / Enneagram ' +
      ennLabel +
      ': ' +
      d.relation +
      ' This is not destiny — it is the pattern you are most likely to repeat until you notice it in real time.'
    );
  }

  function buildPoliticalNarrative(mbti, enn, polX, polY, polQuad, polIdeology) {
    var q = POL_QUAD_DEPTH[polQuad] || POL_QUAD_DEPTH['lib-right'];
    var ennLabel = (enn.type || '9') + 'w' + (enn.wing || '1');
    var x = Math.round(polX || 0);
    var y = Math.round(polY || 0);

    return (
      'Your compass place — ' +
      q.title +
      ' (' +
      (polIdeology || 'your ideology cluster') +
      ') — is built from your answers on economic (X=' +
      x +
      ': right vs left) and social authority (Y=' +
      y +
      ': libertarian vs authoritarian). The coordinates are the source of truth; the label summarizes them.\n\n' +
      'Economics for you: ' +
      q.economics +
      '\n\n' +
      'Social freedom vs order: ' +
      q.social +
      '\n\n' +
      'What this means in your life: ' +
      q.forYou +
      ' As ' +
      mbti +
      ' with Enneagram ' +
      ennLabel +
      ', you may reach this quadrant through how you balance competence, care, risk, and loyalty — not because the test "assigned" a party to your type.\n\n' +
      'Honest tensions: ' +
      q.blind +
      ' Use the comparisons and thinker lists on this tab as illustrations of your coordinates, not as instructions for how you must vote.'
    );
  }

  function buildCogNarrative(mbti, dom, aux, cogDesc, cogDescFn) {
    var domText = cogDesc[dom] || 'shapes how you take in and organize experience.';
    var auxText = cogDesc[aux] || 'supports your lead process.';
    return (
      'As ' +
      mbti +
      ', your mind is organized around ' +
      dom +
      ' first and ' +
      aux +
      ' second — not as abstract letters, but as habits of attention.\n\n' +
      'Dominant ' +
      dom +
      ': ' +
      domText +
      '\n\n' +
      'Auxiliary ' +
      aux +
      ': ' +
      auxText +
      '\n\n' +
      'What this means day to day: problems arrive and you unconsciously route them through this stack before you "decide" anything. Others may see the output (' +
      (mbti.indexOf('J') >= 0 ? 'plans, standards, closure' : 'options, improvisation, exploration') +
      ') without seeing the internal sequence. Under stress you may overuse ' +
      dom +
      ' or fall into your lower functions — that is when you feel "not yourself" even though you are still running the same architecture.\n\n' +
      (typeof cogDescFn === 'function' ? cogDescFn(mbti, dom, aux) : '')
    );
  }

  function buildPoliticalIdeologyDesc(polIdeology, polX, polY, polQuad) {
    var q = POL_QUAD_DEPTH[polQuad] || POL_QUAD_DEPTH['lib-right'];
    return (
      (polIdeology || q.title) +
      ' is the shorthand for your coordinate cluster. It names a tradition you resonate with — not a membership card. ' +
      'Your X/Y scores (' +
      Math.round(polX || 0) +
      ', ' +
      Math.round(polY || 0) +
      ') sit in ' +
      q.title +
      ': ' +
      q.forYou
    );
  }

  g.ProfileNarrativeDepth = {
    buildEnnNarrative: buildEnnNarrative,
    buildPhiNarrative: buildPhiNarrative,
    buildAttNarrative: buildAttNarrative,
    buildPoliticalNarrative: buildPoliticalNarrative,
    buildCogNarrative: buildCogNarrative,
    buildPoliticalIdeologyDesc: buildPoliticalIdeologyDesc,
    PHI_DEPTH: PHI_DEPTH,
    ENN_CORE: ENN_CORE,
    POL_QUAD_DEPTH: POL_QUAD_DEPTH
  };
})(typeof window !== 'undefined' ? window : globalThis);
