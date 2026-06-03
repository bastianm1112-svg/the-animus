/**
 * Rich "what this means for you" profile copy — used by ProfileNarratives fallback
 * and whenever refreshSnapshotNarratives rebuilds text (including admin-locked profiles).
 */
(function (g) {
  'use strict';

  var ENN_CORE = {
    '1': {
      name: 'The Standard-bearer',
      fear: 'being corrupt, defective, or morally wrong',
      desire: 'to be good, balanced, and have integrity',
      drive: 'an inner critic that constantly measures reality against an ideal standard'
    },
    '2': {
      name: 'The Ally',
      fear: 'being unwanted or unloved for who you are',
      desire: 'to feel needed and appreciated',
      drive: 'attunement to others\' needs — often before your own register on the radar'
    },
    '3': {
      name: 'The Striver',
      fear: 'being worthless without success or admiration',
      desire: 'to feel valuable and worthwhile through accomplishment',
      drive: 'efficiency in self-presentation and a focus on goals that earn recognition'
    },
    '4': {
      name: 'The Seeker',
      fear: 'having no identity or significance',
      desire: 'to find yourself and be understood in your depth',
      drive: 'emotional honesty and a pull toward what feels authentic, even when painful'
    },
    '5': {
      name: 'The Sage',
      fear: 'being useless, incapable, or overwhelmed',
      desire: 'to be competent and understand the world',
      drive: 'conservation of energy and attention — you gather knowledge before you spend yourself'
    },
    '6': {
      name: 'The Sentinel',
      fear: 'being without support or guidance',
      desire: 'to have security and trustworthy structure',
      drive: 'scanning for risk and building alliances with people and systems you can rely on'
    },
    '7': {
      name: 'The Spark',
      fear: 'being trapped in pain or deprivation',
      desire: 'to be satisfied and experience life fully',
      drive: 'rapid reframing toward possibility — your mind moves away from limitation toward options'
    },
    '8': {
      name: 'The Vanguard',
      fear: 'being controlled or violated',
      desire: 'to protect yourself and determine your own path',
      drive: 'directness about power — you test strength and resist being managed'
    },
    '9': {
      name: 'The Harmonizer',
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

  var MBTI_STACKS = {
    INTJ: ['Ni', 'Te', 'Fi', 'Se'], INTP: ['Ti', 'Ne', 'Si', 'Fe'], ENTJ: ['Te', 'Ni', 'Se', 'Fi'],
    ENTP: ['Ne', 'Ti', 'Fe', 'Si'], INFJ: ['Ni', 'Fe', 'Ti', 'Se'], INFP: ['Fi', 'Ne', 'Si', 'Te'],
    ENFJ: ['Fe', 'Ni', 'Se', 'Ti'], ENFP: ['Ne', 'Fi', 'Te', 'Si'], ISTJ: ['Si', 'Te', 'Fi', 'Ne'],
    ISFJ: ['Si', 'Fe', 'Ti', 'Ne'], ESTJ: ['Te', 'Si', 'Ne', 'Fi'], ESFJ: ['Fe', 'Si', 'Ne', 'Ti'],
    ISTP: ['Ti', 'Se', 'Ni', 'Fe'], ISFP: ['Fi', 'Se', 'Ni', 'Te'], ESTP: ['Se', 'Ti', 'Fe', 'Ni'],
    ESFP: ['Se', 'Fi', 'Te', 'Ni']
  };

  var COG_PRACTICE = {
    Ni: 'You compress scattered facts into a single trajectory — in meetings you may already be three steps ahead while others are still listing options.',
    Ne: 'You spin alternatives fast — brainstorming energizes you, but you may start five projects because each possibility feels equally alive.',
    Ti: 'You rebuild ideas from first principles — when something feels wrong, you disassemble the logic rather than accepting authority or tradition.',
    Te: 'You move toward measurable outcomes — vague plans frustrate you; you ask what works, who owns it, and when it ships.',
    Fi: 'You filter decisions through inner alignment — a choice can feel physically wrong even when it looks smart on paper.',
    Fe: 'You read the emotional temperature of a room and adjust — harmony is not performance for you; it is how you know whether truth can land.',
    Si: 'You trust what has been proven — routines, checklists, and precedent are not boredom; they are how reliability gets built.',
    Se: 'You respond to what is happening now — you learn by doing, fix problems in motion, and often notice physical details others skip.'
  };

  var COG_SHADOW = {
    Ni: 'certainty in your own vision can make you dismissive of data that does not fit the trajectory you already see forming',
    Ne: 'generative range can make follow-through and sustained commitment genuinely difficult — every new idea steals oxygen from the last',
    Ti: 'rigorous internal logic can disconnect you from the emotional intelligence relationships require — being right is not the same as being understood',
    Te: 'drive for efficiency can override sensitivity to human cost — optimization becomes the answer even when the problem is grief or trust',
    Fi: 'depth of individual values can create moral certainty that is hard for others to engage with — they experience conviction as judgment',
    Fe: 'orientation toward others\' needs can suppress your own until they resurface in unpredictable ways — resentment arrives disguised as exhaustion',
    Si: 'reliance on established frameworks can create resistance to change even when change is clearly necessary — the familiar feels safer than the true',
    Se: 'orientation toward immediate experience can make long-range strategic thinking genuinely effortful — urgency wins over architecture'
  };

  var ENN_PRACTICE = {
    '1': {
      secure: 'You edit reality toward a standard — correcting typos, fixing processes, holding yourself to rules you wish others would follow.',
      stress: 'The inner critic accelerates: rest feels irresponsible, and you may become sharp with people who seem careless or morally lazy.',
      why: 'Type 1 runs on an internal judge that equates worth with correctness — improvement is how you prove you are good.'
    },
    '2': {
      secure: 'You anticipate needs before they are spoken — offering help, remembering preferences, making yourself useful in ways that build belonging.',
      stress: 'Giving becomes transactional: you track who appreciated you, resent unreciprocated effort, or merge so fully you lose track of your own preferences.',
      why: 'Type 2 converts care into currency — being needed feels safer than being fully seen without a role to perform.'
    },
    '3': {
      secure: 'You optimize for visible competence — polishing deliverables, adapting persona to audience, measuring days by what got done and recognized.',
      stress: 'Image replaces substance: you may cut corners emotionally, hide failure, or collapse when applause stops.',
      why: 'Type 3 ties identity to achievement — worth feels earned in real time, not inherited or assumed.'
    },
    '4': {
      secure: 'You seek emotional truth in experience — curating environment, art, and relationships that feel authentic even when inconvenient.',
      stress: 'Comparison and melancholy intensify — you may withdraw, dramatize lack, or reject good things because they feel ordinary.',
      why: 'Type 4 believes the real self is found in depth and difference — sameness registers as spiritual death.'
    },
    '5': {
      secure: 'You budget energy carefully — researching before acting, protecting solitude, speaking only when you have something structurally sound to say.',
      stress: 'Withdrawal hardens into isolation — you hoard knowledge, avoid need, and treat intrusion as threat rather than connection.',
      why: 'Type 5 equates safety with competence and privacy — the world feels demanding, so you reduce exposure.'
    },
    '6': {
      secure: 'You scan for reliability — testing loyalty, building backup plans, aligning with trusted people and systems before you commit.',
      stress: 'Doubt loops: suspicion, procrastination, or reactive rebellion against authority you both need and resent.',
      why: 'Type 6 runs a risk engine — security is never assumed; it must be verified continuously.'
    },
    '7': {
      secure: 'You reframe limitation into option — new plans, trips, ideas, or jokes arrive when discomfort threatens to settle in.',
      stress: 'Scattered escape — you may overcommit, numb out, or treat painful feelings as problems to outrun rather than signals to hear.',
      why: 'Type 7 treats freedom as survival — pain feels like a trap, so the mind moves toward the next open door.'
    },
    '8': {
      secure: 'You take charge when ambiguity threatens people you care about — direct speech, fast decisions, willingness to absorb conflict others avoid.',
      stress: 'Control tightens — intimidation, impatience, or preemptive strikes against perceived betrayal, even when none was intended.',
      why: 'Type 8 equates vulnerability with danger — strength is how you keep yourself and yours from being harmed.'
    },
    '9': {
      secure: 'You merge with comfort — smoothing friction, deferring preference, keeping the peace so connection stays intact.',
      stress: 'Passive resistance or numb autopilot — you agree outwardly while disappearing inwardly, then explode or escape when pressure builds silently.',
      why: 'Type 9 treats conflict as existential risk — harmony preserves selfhood when asserting preference feels like risking belonging.'
    }
  };

  var ATT_COG_WIRE = {
    AT_SEC: { Ti: 'you can disagree logically without fearing the relationship will collapse', Fe: 'you express care without losing yourself in others\' moods', Fi: 'you honor values while staying open to repair', Te: 'you pursue goals without treating intimacy as inefficiency' },
    AT_ANX: { Ti: 'uncertainty makes you over-analyze messages for proof of abandonment', Fe: 'you may over-function for others hoping they will not leave', Fi: 'silence feels like rejection even when it is only distance', Te: 'performance pressure spikes — you need reassurance that effort equals security' },
    AT_AVO: { Ti: 'autonomy feels safer than needing anyone — you solve alone first', Fe: 'warmth is real but rationed — too much closeness triggers retreat', Fi: 'vulnerability feels like handing someone a weapon', Te: 'competence replaces asking for help; dependence reads as failure' },
    AT_DIS: { Ti: 'you intellectualize need — feelings get translated into problems to solve from a safe distance', Fe: 'you perform care while keeping core need off the table', Fi: 'longing and terror coexist — you want closeness and expect hurt', Te: 'self-reliance is armor; letting someone in requires evidence over time' }
  };

  function phiKey(phi) {
    var p = String(phi || 'PH_PRA').toUpperCase();
    return PHI_DEPTH[p] ? p : 'PH_PRA';
  }

  function scoreBand(n) {
    n = Math.round(Number(n) || 50);
    if (n >= 65) return 'high';
    if (n <= 40) return 'low';
    return 'moderate';
  }

  function describeCogSpread(cog, dom, aux, mbti) {
    if (!cog || typeof cog !== 'object') return '';
    var stack = MBTI_STACKS[mbti] || [dom, aux, 'Ti', 'Fe'];
    var domS = Math.round(cog[dom] || 50);
    var auxS = Math.round(cog[aux] || 50);
    var tert = stack[2] || 'Ti';
    var inf = stack[3] || 'Fe';
    var tertS = Math.round(cog[tert] || 50);
    var infS = Math.round(cog[inf] || 50);
    var gap = domS - auxS;
    var spread =
      'Your scores put ' +
      dom +
      ' at ' +
      domS +
      ' and ' +
      aux +
      ' at ' +
      auxS +
      (gap >= 12
        ? ' — a clear lead function, so ' + dom + ' usually wins internal debates before ' + aux + ' gets a turn.'
        : gap <= -8
          ? ' — unusually close for dominant/auxiliary, so you may flip between ' + dom + ' and ' + aux + ' depending on context.'
          : ' — a typical dominant/auxiliary pairing with enough gap that your default processing path is recognizable.');
    if (scoreBand(infS) === 'high' && infS >= domS - 15) {
      spread +=
        ' Your inferior ' +
        inf +
        ' at ' +
        infS +
        ' is relatively active — under stress you may overcorrect into ' +
        inf +
        ' behaviors (over-sensitivity, impulsive action, or obsessive detail) rather than your usual ' +
        dom +
        ' poise.';
    } else if (scoreBand(tertS) === 'high') {
      spread +=
        ' Tertiary ' +
        tert +
        ' at ' +
        tertS +
        ' gives you a familiar fallback when relaxed — hobbies, humor, or side projects often run through ' +
        tert +
        ', not ' +
        dom +
        '.';
    }
    return spread;
  }

  function buildEnnNarrative(mbti, enn, data) {
    var type = String(enn.type || '9').replace(/\D/g, '') || '9';
    var wing = String(enn.wing || '1').replace(/\D/g, '') || '1';
    var core = ENN_CORE[type] || ENN_CORE['9'];
    var practice = ENN_PRACTICE[type] || ENN_PRACTICE['9'];
    var wingNote = (WING_FLAVOR[type] && WING_FLAVOR[type][wing]) || 'adds a secondary color to how your core motivation shows up';

    var p1 =
      'Your Enneagram ' +
      type +
      'w' +
      wing +
      ' (' +
      core.name +
      ') names a recurring engine, not a personality sticker. Core fear: ' +
      core.fear +
      '. Core desire: ' +
      core.desire +
      '. Mechanism: ' +
      core.drive +
      ' Why it runs: ' +
      practice.why;

    var p2 =
      'What you actually do: when you feel secure, ' +
      practice.secure +
      ' Under pressure, the same pattern tightens — ' +
      practice.stress +
      ' The ' +
      wing +
      ' wing ' +
      wingNote +
      ', so outsiders may read your ' +
      type +
      ' through that secondary flavor.';

    var p3 = '';
    if (enn.tritype) {
      p3 =
        '\n\nYour tritype ' +
        enn.tritype +
        ' shows how gut (8-9-1), heart (2-3-4), and head (5-6-7) centers each vote. Inner conflict often means three legitimate motives pulling at once — not inconsistency.';
    }

    var scoreNote = '';
    if (data && data.ennScores && typeof data.ennScores === 'object') {
      var typeScore = Math.round(data.ennScores[type] || data.ennScores['type' + type] || 0);
      if (typeScore > 0) {
        scoreNote =
          '\n\nYour answers weighted type ' +
          type +
          ' at ' +
          typeScore +
          ' — this is your primary motivational gravity, not a tie-breaker label.';
      }
    }

    var mbtiBridge =
      '\n\nWith ' +
      mbti +
      ', this motivation routes through your cognitive stack: the same Enneagram type can look strategic, artistic, or administrative depending on which functions lead. Your profile links the why (' +
      type +
      'w' +
      wing +
      ') to the how (' +
      mbti +
      ') so the description matches your scores, not a generic brochure.';

    return p1 + '\n\n' + p2 + p3 + scoreNote + mbtiBridge;
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

  function buildAttNarrative(att, mbti, enn, cog, data) {
    var key = ATT_DEPTH[att] ? att : 'AT_SEC';
    var d = ATT_DEPTH[key];
    var ennLabel = (enn.type || '9') + 'w' + (enn.wing || '1');
    var dom = cog && typeof cog === 'object'
      ? Object.keys(cog).sort(function (a, b) { return (cog[b] || 0) - (cog[a] || 0); })[0]
      : 'Ti';
    var wire = (ATT_COG_WIRE[key] && ATT_COG_WIRE[key][dom]) || 'your thinking style shapes how closeness feels safe or threatening.';
    var scoreNote = '';
    if (data && data.attScores && typeof data.attScores === 'object') {
      var attKey = att.replace('AT_', '').toLowerCase();
      var attScore = Math.round(data.attScores[att] || data.attScores[attKey] || 0);
      if (attScore > 0) {
        scoreNote = ' Your assessment weighted ' + d.label + ' at ' + attScore + ' relative to other attachment patterns.';
      }
    }
    return (
      'Attachment style (' +
      d.label +
      ') is the default program you run in close relationships — often before conscious choice.\n\n' +
      'Mechanism: ' +
      d.means +
      '\n\n' +
      'What you do in practice as ' +
      mbti +
      ' / Enneagram ' +
      ennLabel +
      ': ' +
      d.relation +
      ' With ' +
      dom +
      ' leading your cognition, ' +
      wire +
      scoreNote +
      '\n\n' +
      'This is not destiny — it is the loop you are most likely to repeat until you notice the trigger (distance, criticism, need) in real time.'
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

  function buildCogNarrative(mbti, dom, aux, cogDesc, cogScores, cogDescFn) {
    if (typeof cogScores === 'function') {
      cogDescFn = cogScores;
      cogScores = null;
    }
    var domText = cogDesc[dom] || 'shapes how you take in and organize experience.';
    var auxText = cogDesc[aux] || 'supports your lead process.';
    var domPractice = COG_PRACTICE[dom] || '';
    var auxPractice = COG_PRACTICE[aux] || '';
    var spread = describeCogSpread(cogScores, dom, aux, mbti);
    return (
      'As ' +
      mbti +
      ', your mind runs ' +
      dom +
      ' first and ' +
      aux +
      ' second — habits of attention, not abstract letters.\n\n' +
      'Dominant ' +
      dom +
      ' (' +
      (cogScores && cogScores[dom] != null ? Math.round(cogScores[dom]) : '—') +
      '): ' +
      domText +
      ' In practice: ' +
      domPractice +
      '\n\n' +
      'Auxiliary ' +
      aux +
      ' (' +
      (cogScores && cogScores[aux] != null ? Math.round(cogScores[aux]) : '—') +
      '): ' +
      auxText +
      ' In practice: ' +
      auxPractice +
      (spread ? '\n\n' + spread : '') +
      '\n\n' +
      'Why this stack feels like you: problems arrive and you route them through ' +
      dom +
      ' before you consciously "decide." Others see the output (' +
      (mbti.indexOf('J') >= 0 ? 'plans, standards, closure' : 'options, improvisation, exploration') +
      ') without seeing the internal sequence. Under stress you may overuse ' +
      dom +
      ' or slip into inferior patterns — that is when you feel "not yourself" while still running the same architecture.\n\n' +
      (typeof cogDescFn === 'function' ? cogDescFn(mbti, dom, aux) : '')
    );
  }

  function stripYouLead(s) {
    return String(s || '').replace(/^You\s+/i, '').replace(/\.$/, '');
  }

  function buildAloneNarrative(mbti, enn, att, cog) {
    cog = cog && typeof cog === 'object' ? cog : {};
    var dom = Object.keys(cog).sort(function (a, b) { return (cog[b] || 0) - (cog[a] || 0); })[0] || 'Ti';
    var isIntro = 'INFJ,INTJ,INFP,INTP,ISFJ,ISTJ,ISFP,ISTP'.indexOf(mbti) >= 0;
    var ennLabel = (enn.type || '9') + 'w' + (enn.wing || '1');
    var practice = ENN_PRACTICE[String(enn.type || '9').replace(/\D/g, '')] || ENN_PRACTICE['9'];
    var attKey = ATT_DEPTH[att] ? att : 'AT_SEC';
    var attLabel = ATT_DEPTH[attKey].label;

    if (isIntro) {
      return (
        'Alone, you recharge the architecture that runs in public. As ' +
        mbti +
        ' (Enneagram ' +
        ennLabel +
        '), solitude is where ' +
        dom +
        ' does its deepest work — not empty time, but processing. ' +
        COG_PRACTICE[dom] +
        ' Your Enneagram pattern uses alone time to ' +
        stripYouLead(practice.secure) +
        '. With ' +
        attLabel +
        ' attachment, privacy is how you regulate closeness — you need space to know what you actually think and feel before re-entering relationship.'
      );
    }
    return (
      'Even as extraverted ' +
      mbti +
      ' (Enneagram ' +
      ennLabel +
      '), you still need decompression — social energy is real, but integration happens offline. Alone time lets ' +
      dom +
      ' sort what you gathered: ' +
      COG_PRACTICE[dom] +
      ' Without that pass, you may perform continuously while losing track of why you said yes. ' +
      attLabel +
      ' attachment means your solo rhythm is how you prevent closeness from becoming performance.'
    );
  }

  function buildSocialNarrative(mbti, enn, att, cog) {
    cog = cog && typeof cog === 'object' ? cog : {};
    var dom = Object.keys(cog).sort(function (a, b) { return (cog[b] || 0) - (cog[a] || 0); })[0] || 'Fe';
    var aux = Object.keys(cog).sort(function (a, b) { return (cog[b] || 0) - (cog[a] || 0); })[1] || 'Ni';
    var isIntro = 'INFJ,INTJ,INFP,INTP,ISFJ,ISTJ,ISFP,ISTP'.indexOf(mbti) >= 0;
    var ennLabel = (enn.type || '9') + 'w' + (enn.wing || '1');
    var practice = ENN_PRACTICE[String(enn.type || '9').replace(/\D/g, '')] || ENN_PRACTICE['9'];
    var attKey = ATT_DEPTH[att] ? att : 'AT_SEC';
    var attRel = ATT_DEPTH[attKey].relation;

    if (isIntro) {
      return (
        'With others, you often lead with curated bandwidth. As ' +
        mbti +
        ' / ' +
        ennLabel +
        ', you may seem quieter than your inner life — ' +
        dom +
        ' + ' +
        aux +
        ' processes internally before speech. Socially you ' +
        stripYouLead(practice.secure) +
        '. ' +
        attRel +
        ' People who know you well see depth; acquaintances may misread reserve as disinterest.'
      );
    }
    return (
      'With others, you engage the room as ' +
      mbti +
      ' / ' +
      ennLabel +
      ' — ' +
      dom +
      ' forward, which means you ' +
      stripYouLead(COG_PRACTICE[dom]) +
      ' Your Enneagram ' +
      enn.type +
      ' adds: ' +
      stripYouLead(practice.secure) +
      ' ' +
      attRel +
      ' The gap between your public energy and private cost is where self-awareness pays off.'
    );
  }

  function buildShadowNarrative(mbti, enn, dom, aux, cog) {
    cog = cog && typeof cog === 'object' ? cog : {};
    dom = dom || 'Ti';
    aux = aux || 'Ni';
    var stack = MBTI_STACKS[mbti] || [dom, aux, 'Ti', 'Fe'];
    var inf = stack[3] || 'Fe';
    var shadow = COG_SHADOW[dom] || 'your strengths can invert under pressure';
    var ennType = String(enn.type || '9').replace(/\D/g, '') || '9';
    var practice = ENN_PRACTICE[ennType] || ENN_PRACTICE['9'];
    var domS = cog[dom] != null ? Math.round(cog[dom]) : null;
    return (
      'Shadow is not a separate self — it is your stack misfiring. ' +
      dom +
      (domS != null ? ' at ' + domS : '') +
      ' dominance means ' +
      shadow +
      '. When Enneagram ' +
      ennType +
      ' stress hits, the same move intensifies: ' +
      practice.stress +
      ' Watch for inferior ' +
      inf +
      ' eruptions — sudden impulsivity, harsh self-criticism, or emotional flooding that does not match your usual ' +
      mbti +
      ' presentation. Naming the loop (' +
      dom +
      ' overreach + type ' +
      ennType +
      ' fear) is the first step to choosing a different response.'
    );
  }

  function buildTagline(mbti, enn, dom, aux, cog) {
    cog = cog && typeof cog === 'object' ? cog : {};
    var ennType = String(enn.type || '9').replace(/\D/g, '') || '9';
    var core = ENN_CORE[ennType] || ENN_CORE['9'];
    var domS = cog[dom] != null ? Math.round(cog[dom]) : null;
    var practice = ENN_PRACTICE[ennType] || ENN_PRACTICE['9'];
    return (
      'An ' +
      mbti +
      ' mind led by ' +
      dom +
      (domS != null ? ' (' + domS + ')' : '') +
      ', driven by ' +
      core.name.replace(/^The /i, '').toLowerCase() +
      ' motives — you ' +
      stripYouLead(practice.secure) +
      ', routed through ' +
      aux +
      ' when the world demands a response.'
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
    buildAloneNarrative: buildAloneNarrative,
    buildSocialNarrative: buildSocialNarrative,
    buildShadowNarrative: buildShadowNarrative,
    buildTagline: buildTagline,
    PHI_DEPTH: PHI_DEPTH,
    ENN_CORE: ENN_CORE,
    POL_QUAD_DEPTH: POL_QUAD_DEPTH
  };
})(typeof window !== 'undefined' ? window : globalThis);
