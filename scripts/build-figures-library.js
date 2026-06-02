const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const narr = fs.readFileSync(path.join(root, 'js/profile-narratives.js'), 'utf8');

const EXTRA = {
  INTJ: [
    ['Friedrich Nietzsche', 'Historical', 5, 4, 'Lone philosopher who built systems from interior vision.'],
    ['Nikola Tesla', 'Historical', 5, 6, 'Inventor driven by internal models of possibility.'],
    ['Greta Thunberg', 'Celebrity', 1, 2, 'Principled advocate with long-horizon moral focus.'],
    ['Tywin Lannister', 'Pop Culture', 8, 1, 'Strategic authority optimizing systems for control.'],
    ['Lisbeth Salander', 'Pop Culture', 5, 4, 'Independent analyst operating outside institutions.'],
    ['Hannah Arendt', 'Historical', 5, 6, 'Political thinker parsing power with conceptual rigor.'],
    ['Michelle Obama', 'Celebrity', 1, 2, 'Disciplined leader pairing vision with execution.'],
    ['Marcus Aurelius', 'Historical', 1, 9, 'Stoic emperor structuring duty into daily practice.']
  ],
  INTP: [
    ['Richard Feynman', 'Historical', 5, 7, 'Playful theorist who stress-tests ideas experimentally.'],
    ['Marie Curie', 'Historical', 5, 6, 'Pioneer researcher pursuing truth past convention.'],
    ['Bill Gates (early)', 'Celebrity', 5, 6, 'Systems thinker optimizing abstractions at scale.'],
    ['Rick Sanchez', 'Pop Culture', 5, 7, 'Cynical genius exploring ideas without social filter.'],
    ['Neo (Matrix)', 'Pop Culture', 5, 4, 'Questions reality until underlying structure appears.'],
    ['Ada Lovelace', 'Historical', 5, 4, 'First programmer — logic as creative medium.'],
    ['Jesse Pinkman', 'Pop Culture', 6, 7, 'Loyal skeptic who learns through lived experiment.'],
    ['Socrates', 'Historical', 5, 6, 'Dialectician dismantling assumptions through questions.']
  ],
  ENTJ: [
    ['Alexander the Great', 'Historical', 8, 7, 'Conquered through strategic tempo and personal will.'],
    ['Sheryl Sandberg', 'Celebrity', 3, 2, 'Executive operator scaling organizations decisively.'],
    ['Miranda Priestly', 'Pop Culture', 1, 2, 'Demanding commander with exacting standards.'],
    ['Erwin Smith', 'Pop Culture', 1, 9, 'Commander who sacrifices for strategic objectives.'],
    ['Angela Merkel', 'Historical', 1, 6, 'Pragmatic institutional leader under pressure.'],
    ['Kamala Harris', 'Celebrity', 3, 2, 'Prosecutorial communicator driving outcomes.'],
    ['Tony Soprano', 'Pop Culture', 8, 9, 'Organizational patriarch balancing power and family.'],
    ['Condoleezza Rice', 'Historical', 3, 2, 'Strategic diplomat executing long-range policy.']
  ],
  ENTP: [
    ['Mark Twain', 'Historical', 7, 8, 'Satirical mind reframing culture through wit.'],
    ['Ryan Reynolds', 'Celebrity', 7, 8, 'Improvisational humor as social intelligence.'],
    ['The Doctor (Who)', 'Pop Culture', 7, 8, 'Restless explorer generating solutions on the fly.'],
    ['Richard Feynman', 'Historical', 7, 8, 'Curious provocateur in physics and teaching.'],
    ['Tom Hiddleston', 'Celebrity', 4, 3, 'Charismatic performer with quick conceptual range.'],
    ['Fred from Scooby-Doo', 'Pop Culture', 7, 6, 'Talkative idea-generator in chaotic teams.'],
    ['Catherine the Great', 'Historical', 3, 8, 'Reformer who challenged orthodoxy with bold policy.'],
    ['Weird Al Yankovic', 'Celebrity', 7, 6, 'Recombines culture through playful invention.']
  ],
  INFJ: [
    ['Dostoevsky', 'Historical', 4, 5, 'Novelist of moral depth and inner conflict.'],
    ['Carl Jung', 'Historical', 4, 5, 'Explorer of symbolic inner life and meaning.'],
    ['Lady Gaga', 'Celebrity', 4, 3, 'Artistic channel for identity and empathy.'],
    ['Aragorn', 'Pop Culture', 1, 9, 'Reluctant king guided by duty and vision.'],
    ['Simone Weil', 'Historical', 4, 5, 'Mystic intellectual serving truth through sacrifice.'],
    ['Rosa Parks', 'Historical', 1, 9, 'Quiet moral courage shifting collective history.'],
    ['Amélie Poulain', 'Pop Culture', 9, 1, 'Subtle caretaker improving lives in the margins.'],
    ['Jordan Peterson', 'Celebrity', 1, 6, 'Maps meaning and responsibility for followers.']
  ],
  INFP: [
    ['Kurt Cobain', 'Celebrity', 4, 5, 'Raw authenticity as artistic identity.'],
    ['Princess Diana', 'Celebrity', 2, 3, 'Compassionate icon challenging stiff institutions.'],
    ['Frodo Baggins', 'Pop Culture', 9, 1, 'Moral endurance through quiet conviction.'],
    ['Hayao Miyazaki', 'Celebrity', 4, 5, 'Gentle worlds rooted in ecological values.'],
    ['John Lennon', 'Celebrity', 4, 5, 'Idealist artist imagining collective peace.'],
    ['Luna Lovegood', 'Pop Culture', 4, 5, 'Unwavering inner truth despite social oddity.'],
    ['Franz Kafka', 'Historical', 4, 5, 'Alienation rendered as symbolic literature.'],
    ['Spike Lee', 'Celebrity', 4, 5, 'Storyteller of identity and moral complexity.']
  ],
  ENFJ: [
    ['Nelson Mandela', 'Historical', 1, 2, 'Reconciler who held moral vision over decades.'],
    ['Mufasa', 'Pop Culture', 1, 2, 'Protective leader modeling responsibility.'],
    ['Dwayne Johnson', 'Celebrity', 3, 2, 'Charismatic motivator energizing groups.'],
    ['Leslie Knope', 'Pop Culture', 2, 3, 'Relentless community builder through service.'],
    ['Pope John Paul II', 'Historical', 2, 1, 'Pastoral figure mobilizing global conscience.'],
    ['Daenerys Targaryen', 'Pop Culture', 2, 3, 'Charismatic liberator with growing shadow.'],
    ['Brene Brown', 'Celebrity', 2, 3, 'Researcher teaching vulnerability as strength.'],
    ['Coach Carter', 'Pop Culture', 1, 2, 'Demanding mentor framing discipline as love.']
  ],
  ENFP: [
    ['Walt Disney', 'Historical', 7, 6, 'Imaginative builder of shared wonder.'],
    ['Robert Downey Jr.', 'Celebrity', 7, 8, 'Wit, warmth, and reinvention on display.'],
    ['Anna (Frozen)', 'Pop Culture', 7, 6, 'Optimistic connector thawing isolation.'],
    ['Russell Brand', 'Celebrity', 7, 8, 'Performer-activist blending humor and ideals.'],
    ['Phoebe Buffay', 'Pop Culture', 7, 6, 'Unfiltered authenticity in social life.'],
    ['Miles Morales', 'Pop Culture', 7, 6, 'Youthful creativity meeting responsibility.'],
    ['Coco Chanel', 'Historical', 3, 4, 'Reinvented style as personal liberation.'],
    ['Jack Sparrow', 'Pop Culture', 7, 8, 'Improvisational survivor reading the moment.']
  ],
  ISTJ: [
    ['George Washington', 'Historical', 1, 9, 'Institutional founder through disciplined duty.'],
    ['Angela Merkel', 'Historical', 6, 5, 'Steady steward of procedural stability.'],
    ['Hermione Granger', 'Pop Culture', 1, 2, 'Preparedness and rules as moral backbone.'],
    ['Denzel Washington', 'Celebrity', 1, 9, 'Craft mastery through consistent reliability.'],
    ['Inspector Lestrade', 'Pop Culture', 6, 5, 'Procedure-first investigator in chaos.'],
    ['Queen Elizabeth II', 'Historical', 1, 9, 'Symbol of continuity and obligation.'],
    ['Mike Ehrmantraut', 'Pop Culture', 6, 5, 'Pragmatic enforcer of professional codes.'],
    ['Warren Buffett', 'Celebrity', 6, 5, 'Long-horizon investor trusting proven systems.']
  ],
  ISFJ: [
    ['Florence Nightingale', 'Historical', 2, 1, 'Reformed care through meticulous service.'],
    ['Beyoncé (caretaker role)', 'Celebrity', 2, 3, 'Protects circle while performing at elite level.'],
    ['Cinderella', 'Pop Culture', 2, 1, 'Quiet resilience and kindness under neglect.'],
    ['Steve Rogers (pre-serum)', 'Pop Culture', 6, 2, 'Duty and loyalty before transformation.'],
    ['Mr. Rogers', 'Celebrity', 2, 1, 'Gentle teacher making children feel safe.'],
    ['Pam Beesly', 'Pop Culture', 2, 1, 'Stabilizing warmth in chaotic workplaces.'],
    ['George Bailey', 'Pop Culture', 2, 1, 'Community pillar sacrificing personal ambition.'],
    ['Kristin Chenoweth', 'Celebrity', 2, 3, 'Warmth and precision in performance.']
  ],
  ESTJ: [
    ['Henry Ford', 'Historical', 3, 2, 'Scaled production through standardized systems.'],
    ['Judge Judy', 'Celebrity', 1, 2, 'Direct adjudicator enforcing clear standards.'],
    ['Dwight Schrute', 'Pop Culture', 6, 5, 'Rule-bound operator seeking rank.'],
    ['Lyndon B. Johnson', 'Historical', 8, 7, 'Legislative arm-twister delivering outcomes.'],
    ['Claire Underwood', 'Pop Culture', 3, 4, 'Executive strategist behind power.'],
    ['Vince Lombardi', 'Historical', 8, 7, 'Demanding coach equating winning with discipline.'],
    ['Ross Geller', 'Pop Culture', 1, 6, 'Structure and correctness as comfort zone.'],
    ['Eleanor Roosevelt (executive)', 'Historical', 1, 2, 'Institutional reform through persistent organization.']
  ],
  ESFJ: [
    ['Taylor Swift (community)', 'Celebrity', 2, 3, 'Maintains intimate fan belonging at scale.'],
    ['Jennifer Garner', 'Celebrity', 2, 1, 'Relatable warmth in family and charity roles.'],
    ['Monica Geller', 'Pop Culture', 2, 1, 'Host whose love language is organized care.'],
    ['Dolly Parton', 'Celebrity', 2, 3, 'Generous storyteller anchoring community.'],
    ['Marge Simpson', 'Pop Culture', 2, 1, 'Domestic glue holding chaos together.'],
    ['Hugh Jackman', 'Celebrity', 2, 3, 'Affable performer prioritizing group morale.'],
    ['Boromir', 'Pop Culture', 6, 2, 'Protector driven by duty to people.'],
    ['Tom Hanks', 'Celebrity', 2, 1, 'America’s approachable moral everyman.']
  ],
  ISTP: [
    ['Clint Eastwood', 'Celebrity', 8, 9, 'Economy of motion and taciturn competence.'],
    ['Michael Jordan', 'Celebrity', 8, 7, 'Cool mastery under competitive pressure.'],
    ['Arya Stark', 'Pop Culture', 8, 7, 'Pragmatic survivor learning skills in motion.'],
    ['James Bond', 'Pop Culture', 8, 7, 'Tactical improviser in physical crisis.'],
    ['Bruce Lee', 'Historical', 8, 7, 'Embodied precision and adaptive fighting philosophy.'],
    ['Boba Fett', 'Pop Culture', 8, 9, 'Independent operator solving problems alone.'],
    ['Zoe Washburne', 'Pop Culture', 8, 9, 'Calm mechanic-pilot in chaos.'],
    ['Bear Grylls', 'Celebrity', 8, 7, 'Survival intelligence applied in real terrain.']
  ],
  ISFP: [
    ['David Bowie', 'Celebrity', 4, 3, 'Aesthetic reinvention as authentic expression.'],
    ['Frida Kahlo', 'Historical', 4, 5, 'Pain and identity rendered as visual truth.'],
    ['Zuko', 'Pop Culture', 4, 3, 'Redemption arc through inner moral struggle.'],
    ['Lana Del Rey', 'Celebrity', 4, 5, 'Mood and beauty as emotional vocabulary.'],
    ['Thranduil', 'Pop Culture', 4, 5, 'Sensory refinement guarding private values.'],
    ['Bob Ross', 'Celebrity', 9, 1, 'Gentle presence making art feel safe.'],
    ['Jimin', 'Celebrity', 4, 3, 'Performance as vulnerable artistry.'],
    ['Hiccup', 'Pop Culture', 4, 5, 'Quiet innovator honoring difference.']
  ],
  ESTP: [
    ['Donald Trump', 'Celebrity', 8, 7, 'Bold operator thriving in public conflict.'],
    ['Madonna', 'Celebrity', 7, 8, 'Reinvents persona to command the moment.'],
    ['Han Solo', 'Pop Culture', 7, 8, 'Improviser who wins through nerve and charm.'],
    ['Tom Cruise', 'Celebrity', 3, 7, 'Kinetic performer pushing physical limits.'],
    ['Evel Knievel', 'Celebrity', 8, 7, 'Risk as spectacle and identity.'],
    ['James Bond (Craig)', 'Pop Culture', 8, 7, 'Physical intelligence in high stakes.'],
    ['Rihanna', 'Celebrity', 7, 8, 'Trend setter moving at market speed.'],
    ['Tyler Durden', 'Pop Culture', 8, 7, 'Charismatic disruptor of complacency.']
  ],
  ESFP: [
    ['Marilyn Monroe', 'Celebrity', 7, 6, 'Magnetic presence channeling vulnerability.'],
    ['Will Smith', 'Celebrity', 7, 6, 'Charisma and optimism as public craft.'],
    ['Peeta Mellark', 'Pop Culture', 2, 3, 'Warmth and artistry under pressure.'],
    ['Miley Cyrus', 'Celebrity', 7, 8, 'Performs authenticity in real time.'],
    ['Donkey (Shrek)', 'Pop Culture', 7, 6, 'Social energy dissolving tension.'],
    ['Sonic the Hedgehog', 'Pop Culture', 7, 8, 'Speed, play, and restless motion.'],
    ['Harry Styles', 'Celebrity', 7, 6, 'Joyful self-expression inviting belonging.'],
    ['Penny (Big Bang)', 'Pop Culture', 7, 6, 'Social intuition grounding intellectual circles.']
  ]
};

function parseNarratives() {
  const catalog = [];
  const types = Object.keys(EXTRA);
  types.forEach((mbti) => {
    (EXTRA[mbti] || []).forEach((row) => {
      catalog.push({ mbti, name: row[0], cat: row[1], e: row[2], w: row[3], note: row[4] });
    });
  });
  const re = /'([A-Z]{4})':\[([^\]]+)\]/g;
  let block;
  while ((block = re.exec(narr)) !== null) {
    const mbti = block[1];
    const inner = block[2];
    const figRe = /name:'([^']+)',cat:'([^']+)',type:'[A-Z]{4} (\d)w(\d)'[^}]*note:'([^']*)'/g;
    let m;
    while ((m = figRe.exec(inner)) !== null) {
      catalog.push({ mbti, name: m[1], cat: m[2], e: +m[4], w: +m[5], note: m[6] || 'Archetypal parallel.' });
    }
  }
  return catalog;
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
}

let catalog = parseNarratives();
const seen = new Set();
catalog = catalog.filter((f) => {
  const k = f.mbti + '|' + f.name;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
const pickTail = `  function initials(name) {
    var parts = String(name || '').replace(/\\([^)]*\\)/g, '').split(/\\s+/).filter(Boolean);
    if (!parts.length) return '??';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatFigure(fig) {
    return {
      name: fig.name,
      cat: fig.cat,
      type: fig.mbti + ' ' + fig.e + 'w' + fig.w,
      initials: initials(fig.name),
      note: fig.note
    };
  }

  function scoreFigure(fig, mbti, ennType, ennWing) {
    var s = 0;
    if (fig.mbti !== mbti) return -1;
    s += 40;
    if (String(fig.e) === String(ennType)) s += 35;
    else if (Math.abs(parseInt(fig.e, 10) - parseInt(ennType, 10)) === 1) s += 12;
    if (String(fig.w) === String(ennWing)) s += 18;
    else if (Math.abs(parseInt(fig.w, 10) - parseInt(ennWing, 10)) === 1) s += 6;
    return s;
  }

  function pickFigures(mbti, ennType, ennWing, limit) {
    mbti = String(mbti || '').toUpperCase();
    ennType = String(ennType || '9').replace(/\\D/g, '') || '9';
    ennWing = String(ennWing || '1').replace(/\\D/g, '') || '1';
    limit = limit || 10;
    var ranked = CATALOG.map(function (fig) {
      return { fig: fig, score: scoreFigure(fig, mbti, ennType, ennWing) };
    })
      .filter(function (r) {
        return r.score >= 0;
      })
      .sort(function (a, b) {
        return b.score - a.score || a.fig.name.localeCompare(b.fig.name);
      });

    var picked = [];
    var cats = { Historical: 0, Celebrity: 0, 'Pop Culture': 0, Philosopher: 0 };
    var quotas = { Historical: 3, Celebrity: 3, 'Pop Culture': 3, Philosopher: 1 };

    ranked.forEach(function (r) {
      if (picked.length >= limit) return;
      var c = r.fig.cat;
      if (quotas[c] != null && cats[c] >= quotas[c]) return;
      var dup = picked.some(function (p) {
        return p.name === r.fig.name;
      });
      if (dup) return;
      picked.push(formatFigure(r.fig));
      if (quotas[c] != null) cats[c]++;
    });

    ranked.forEach(function (r) {
      if (picked.length >= limit) return;
      var dup = picked.some(function (p) {
        return p.name === r.fig.name;
      });
      if (!dup) picked.push(formatFigure(r.fig));
    });

    return picked.slice(0, limit);
  }

  g.AnimusFigures = {
    CATALOG: CATALOG,
    pickFigures: pickFigures,
    formatFigure: formatFigure
  };
})(typeof window !== 'undefined' ? window : globalThis);
`;

const lines = [
  '/** Canonical similar-figure library — fixed typings per person */',
  '(function (g) {',
  "  'use strict';",
  '  var CATALOG = ['
];
catalog.forEach((f, i) => {
  lines.push(
    '    {mbti:"' +
      esc(f.mbti) +
      '",name:"' +
      esc(f.name) +
      '",cat:"' +
      esc(f.cat) +
      '",e:' +
      f.e +
      ',w:' +
      f.w +
      ',note:"' +
      esc(f.note) +
      '"}' +
      (i < catalog.length - 1 ? ',' : '')
  );
});
lines.push('  ];');
lines.push(pickTail);

const out = path.join(root, 'js/figures-library.js');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log('Wrote', out, 'entries:', catalog.length);
