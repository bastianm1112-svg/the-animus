/** Shared fallback profile narratives (MBTI, Enneagram, politics, etc.) */
(function (g) {
  'use strict';

var mbtiMeta={
  INTJ:{n:'The Strategic Visionary',t:'A mind built to see through the noise and reshape reality according to an internal standard nothing outside can compromise.'},
  INTP:{n:'The Analytical Architect',t:'A pure thinking engine that will not rest until every assumption has been examined and every model refined to precision.'},
  ENTJ:{n:'The Commanding Strategist',t:'A natural force of organization and will — you move systems, people, and history toward clearly defined ends.'},
  ENTP:{n:'The Dialectical Provocateur',t:'A restless intellect that finds certainty suspicious and contradiction generative.'},
  INFJ:{n:'The Prophetic Empath',t:'A rare synthesis of deep human understanding and long-range symbolic vision.'},
  INFP:{n:'The Idealistic Visionary',t:'An ocean of inner life governed by values so deep they feel less like beliefs and more like identity.'},
  ENFJ:{n:'The Transformative Catalyst',t:'A natural conductor of human potential — you read people, inspire them, and move them toward a better version of themselves.'},
  ENFP:{n:'The Radically Human',t:'Boundless curiosity, genuine warmth, and a refusal to accept that life is less alive than you know it can be.'},
  ISTJ:{n:'The Reliable Pillar',t:'The quiet architecture of civilization — you build, maintain, and uphold with unshakeable consistency.'},
  ISFJ:{n:'The Devoted Protector',t:'Your greatest strength is invisible to those it protects — and that is exactly how you prefer it.'},
  ESTJ:{n:'The Structural Authority',t:'You are most yourself when order is being built, standards are being upheld, and people are being held accountable.'},
  ESFJ:{n:'The Social Architect',t:'You build and maintain the relational fabric that holds communities together.'},
  ISTP:{n:'The Tactical Craftsman',t:'Cool precision, mastery in motion, and an aversion to anything that cannot be made to work.'},
  ISFP:{n:'The Quiet Composer',t:'A deeply private aesthetic and moral intelligence that rarely announces itself but permeates everything you create.'},
  ESTP:{n:'The Electric Operator',t:'Fully alive in the immediate moment — tactical, bold, and impossible to ignore.'},
  ESFP:{n:'The Radiant Presence',t:'You bring a quality of aliveness to every space you inhabit.'}
};

function buildFallbackNarrative(mbti,enn,att,phi,data){
  var mm = mbtiMeta[mbti] || {n:'The Unknown Archetype', t:'A unique configuration of mind and motivation that defies easy categorization.'};
  var fnsSorted = Object.keys(data.cog).sort(function(a,b){return data.cog[b]-data.cog[a];});
  var dom = fnsSorted[0] || 'Ti';
  var aux = fnsSorted[1] || 'Ni';

  // Cognitive narrative — based on actual dominant function
  var cogDesc = {
    'Ni': 'operates through long-range pattern recognition — you see trajectories and convergent meanings that others miss, and your thinking moves toward singular deep insights rather than broad exploration.',
    'Ne': 'operates through expansive possibility mapping — your mind constantly generates connections, alternatives, and hypotheticals, finding energy in the sheer generative range of ideas.',
    'Ti': 'operates through internal logical frameworks — you build precise models of how things work, holding everything to a standard of internal consistency that external authority cannot override.',
    'Te': 'operates through external systematization — you think in terms of efficiency, structure, and measurable results, and you naturally organize the world toward functional outcomes.',
    'Fi': 'operates through deep individual values — you have a rich interior moral compass that evaluates everything against principles felt as identity, not just as rules.',
    'Fe': 'operates through interpersonal harmony — you are attuned to the emotional atmosphere of groups and relationships, and naturally orient toward what people need.',
    'Si': 'operates through detailed sensory memory and established procedure — you build reliable frameworks from accumulated experience and find security in what has proven to work.',
    'Se': 'operates through immediate sensory engagement — you are fully present to physical reality and respond to it with speed and precision that others often cannot match.'
  };
  var cogNarr = 'As '+mbti+', your dominant function, '+dom+', '+(cogDesc[dom]||'shapes your entire cognitive architecture.')+'\n\nYour auxiliary function, '+aux+', '+(cogDesc[aux]||'provides crucial support.')+' Together these two functions create the characteristic '+mbti+' way of engaging with problems, people, and ideas that others around you likely recognize as distinctly yours.';

  // Social/alone — based on E/I
  var isIntro = 'INFJ,INTJ,INFP,INTP,ISFJ,ISTJ,ISFP,ISTP'.indexOf(mbti) >= 0;
  var isFeel  = 'Fe,Fi'.indexOf(dom) >= 0 || 'Fe,Fi'.indexOf(aux) >= 0;
  var ennLabel = enn.type + 'w' + enn.wing;
  var aloneD  = isIntro
    ? 'As '+mbti+' (Enneagram '+ennLabel+'), solitude restores and clarifies you — your richest thinking happens in stillness, away from the noise of others\' demands and expectations.'
    : 'As '+mbti+' (Enneagram '+ennLabel+'), you still need pockets of solitude to process and integrate — the social world energizes you, but reflection is where you make sense of what you have gathered.';
  var socialD = isIntro
    ? 'As '+mbti+' with Enneagram '+ennLabel+', you often appear more reserved than you feel internally — selective about social energy, which can read as distance while masking depth and warmth on your own terms.'
    : 'As '+mbti+' with Enneagram '+ennLabel+', you engage the social world with natural ease — your energy draws others in, though your inner life is not fully visible from the outside.';
  var shadowD = 'Your greatest strengths cast specific shadows. '+dom+' dominance means that your '+(dom==='Ni'?'certainty in your own vision can make you dismissive of information that does not fit your internal model':dom==='Ne'?'generative range can make follow-through and sustained commitment genuinely difficult':dom==='Ti'?'rigorous internal logic can disconnect you from the emotional intelligence that human relationships require':dom==='Te'?'drive for efficiency can override sensitivity to the human costs of optimization':dom==='Fi'?'depth of individual values can create a moral certainty that is difficult for others to engage with':dom==='Fe'?'orientation toward others\' needs can suppress your own until they resurface in unpredictable ways':dom==='Si'?'reliance on established frameworks can create resistance to change even when change is clearly necessary':'orientation toward immediate experience can make long-term strategic thinking genuinely effortful')+'.';

  // Figures — based on MBTI type
  var figsByType = {
    'INTJ':[{name:'Friedrich Nietzsche',cat:'Historical',type:'INTJ 5w4',initials:'FN',note:'Lone visionary who built philosophy entirely from first principles.'},{name:'Isaac Newton',cat:'Historical',type:'INTJ 5w6',initials:'IN',note:'Systematizing genius who reshaped understanding of reality in solitude.'},{name:'Elon Musk',cat:'Celebrity',type:'INTJ 3w4',initials:'EM',note:'Visionary builder who uses strategic dominance to reshape industries.'},{name:'Walter White',cat:'Pop Culture',type:'INTJ 3w4',initials:'WW',note:'Shadow expression of strategic intelligence divorced from ethics.'},{name:'Batman',cat:'Pop Culture',type:'INTJ 5w6',initials:'Bm',note:'Lone, principled, strategic force operating from a private moral code.'},{name:'Hannibal Lecter',cat:'Pop Culture',type:'INTJ 5w4',initials:'HL',note:'Extreme Ti/Ni intelligence structured around aesthetic mastery.'},{name:'Carl Jung',cat:'Historical',type:'INTJ 5w4',initials:'CJ',note:'Built a complete psychological system from the inside out.'},{name:'Ayn Rand',cat:'Historical',type:'INTJ 1w2',initials:'AR',note:'Constructed a total philosophical system from rational first principles.'}],
    'INTP':[{name:'Albert Einstein',cat:'Historical',type:'INTP 5w4',initials:'AE',note:'Built revolutionary physical models by questioning foundational assumptions.'},{name:'Charles Darwin',cat:'Historical',type:'INTP 5w6',initials:'CD',note:'Constructed the framework of evolution through patient systematic observation.'},{name:'Immanuel Kant',cat:'Historical',type:'INTP 5w6',initials:'IK',note:'Built the most rigorous formal system in the history of Western philosophy.'},{name:'House (MD)',cat:'Pop Culture',type:'INTP 5w4',initials:'HM',note:'Ti-dominant diagnostician who treats logic as the highest value.'},{name:'Sherlock Holmes',cat:'Pop Culture',type:'INTP 5w6',initials:'SH',note:'Pure analytical engine who solves through systematic deduction.'},{name:'L (Death Note)',cat:'Pop Culture',type:'INTP 5w4',initials:'L',note:'Hyper-analytical detective who operates entirely from logical inference.'},{name:'Blaise Pascal',cat:'Historical',type:'INTP 5w6',initials:'BP',note:'Combined mathematical genius with deep philosophical uncertainty.'},{name:'Kurt Gödel',cat:'Historical',type:'INTP 5w4',initials:'KG',note:'Proved the limits of formal systems from within them.'}],
    'ENTJ':[{name:'Napoleon Bonaparte',cat:'Historical',type:'ENTJ 8w7',initials:'NB',note:'Systemic military genius who restructured entire nations by force of will.'},{name:'Julius Caesar',cat:'Historical',type:'ENTJ 3w4',initials:'JC',note:'Combined political acumen, military genius, and personal charisma into dominance.'},{name:'Steve Jobs',cat:'Celebrity',type:'ENTJ 1w2',initials:'SJ',note:'Visionary commander who reshaped multiple industries through strategic force.'},{name:'Frank Underwood',cat:'Pop Culture',type:'ENTJ 3w4',initials:'FU',note:'The shadow expression of strategic dominance and ruthless instrumentalism.'},{name:'Tywin Lannister',cat:'Pop Culture',type:'ENTJ 1w9',initials:'TL',note:'Master strategist who bends institutions to serve his long-term vision.'},{name:'Margaret Thatcher',cat:'Historical',type:'ENTJ 1w2',initials:'MT',note:'Commanding ideological force who remade British economic policy.'},{name:'Gordon Ramsay',cat:'Celebrity',type:'ENTJ 8w7',initials:'GR',note:'High-standards commander who drives excellence through demanding leadership.'},{name:'Jack Welch',cat:'Historical',type:'ENTJ 3w4',initials:'JW',note:'Te-dominant CEO who systematized GE into a performance machine.'}],
    'ENTP':[{name:'Leonardo da Vinci',cat:'Historical',type:'ENTP 7w6',initials:'LD',note:'Polymathic generator who moved fluidly across every domain of knowledge.'},{name:'Voltaire',cat:'Historical',type:'ENTP 7w8',initials:'Vo',note:'Provocateur who used wit and contradiction to dismantle orthodoxy.'},{name:'Robert Downey Jr.',cat:'Celebrity',type:'ENTP 7w8',initials:'RD',note:'Irreverent performer who improvises brilliantly within and around structure.'},{name:'Tony Stark',cat:'Pop Culture',type:'ENTP 3w4',initials:'TS',note:'Ne/Ti inventor-provocateur who constantly reframes problems as opportunities.'},{name:'The Joker (Ledger)',cat:'Pop Culture',type:'ENTP 7w8',initials:'JK',note:'Shadow expression: using contradiction and chaos as philosophical positions.'},{name:'Socrates',cat:'Historical',type:'ENTP 5w6',initials:'So',note:'The original dialectician — pursuing truth through relentless questioning.'},{name:'Benjamin Franklin',cat:'Historical',type:'ENTP 7w6',initials:'BF',note:'Polymathic inventor-diplomat who applied ingenuity to every domain.'},{name:'Mark Twain',cat:'Historical',type:'ENTP 7w8',initials:'MT',note:'Satirist who used humor to deliver devastating social critique.'}],
    'INFJ':[{name:'Carl Jung',cat:'Historical',type:'INFJ 4w5',initials:'CJ',note:'Mapped the depths of the unconscious through symbolic pattern recognition.'},{name:'Mahatma Gandhi',cat:'Historical',type:'INFJ 1w2',initials:'MG',note:'Channeled Ni/Fe into a vision of nonviolent transformation that changed history.'},{name:'Nelson Mandela',cat:'Historical',type:'INFJ 8w9',initials:'NM',note:'Long-range vision combined with strategic patience and moral authority.'},{name:'Atticus Finch',cat:'Pop Culture',type:'INFJ 1w2',initials:'AF',note:'The moral compass in human form — principled, warm, deeply visionary.'},{name:'Yoda',cat:'Pop Culture',type:'INFJ 5w4',initials:'Yo',note:'The archetypal Ni/Fe sage: sees patterns others miss and teaches through relationship.'},{name:'Martin Luther King Jr.',cat:'Historical',type:'INFJ 2w1',initials:'ML',note:'Synthesized prophetic vision and interpersonal warmth into transformative moral leadership.'},{name:'Dostoevsky',cat:'Historical',type:'INFJ 4w5',initials:'FD',note:'Explored the deepest recesses of human psychology through visionary fiction.'},{name:'Tolkien',cat:'Historical',type:'INFJ 5w4',initials:'JT',note:'Created entire worlds from a singular integrated mythological vision.'}],
    'INFP':[{name:'J.R.R. Tolkien',cat:'Historical',type:'INFP 4w5',initials:'JT',note:'Created Middle-earth from a deeply personal interior mythology.'},{name:'Virginia Woolf',cat:'Historical',type:'INFP 4w5',initials:'VW',note:'Stream-of-consciousness pioneer who made inner life the subject of art.'},{name:'Albert Camus',cat:'Historical',type:'INFP 4w5',initials:'AC',note:'Existentialist who combined philosophical depth with profound human warmth.'},{name:'Frodo Baggins',cat:'Pop Culture',type:'INFP 9w1',initials:'FB',note:'The reluctant hero whose internal moral clarity carries him through impossible terrain.'},{name:'Anne Frank',cat:'Historical',type:'INFP 4w3',initials:'AF',note:'Preserved profound interiority and human hope under the most crushing conditions.'},{name:'Sylvia Plath',cat:'Historical',type:'INFP 4w5',initials:'SP',note:'Gave voice to the inner world with devastating precision and unflinching honesty.'},{name:'William Shakespeare',cat:'Historical',type:'INFP 4w5',initials:'WS',note:'Explored the full range of human interiority through character and language.'},{name:'Vincent van Gogh',cat:'Historical',type:'INFP 4w5',initials:'VG',note:'Channeled intense personal vision into art that reshaped how humans see color.'}],
    'ENFJ':[{name:'Martin Luther King Jr.',cat:'Historical',type:'ENFJ 2w1',initials:'ML',note:'Fe-dominant leader who moved masses through moral vision and interpersonal warmth.'},{name:'Oprah Winfrey',cat:'Celebrity',type:'ENFJ 2w3',initials:'OW',note:'Natural catalyst for human growth who builds authentic connection at scale.'},{name:'Barack Obama',cat:'Historical',type:'ENFJ 3w2',initials:'BO',note:'Aspirational leader who inspires through vision, narrative, and interpersonal mastery.'},{name:'Michael Scott',cat:'Pop Culture',type:'ENFJ 2w3',initials:'MS',note:'Fe in overdrive — desperately wants connection and approval from his "family".'},{name:'Emma Woodhouse',cat:'Pop Culture',type:'ENFJ 3w2',initials:'EW',note:'Fe-dominant social orchestrator who means well but over-manages others lives.'},{name:'Nelson Mandela',cat:'Historical',type:'ENFJ 1w2',initials:'NM',note:'Used relational mastery and moral authority to reconcile a divided nation.'},{name:'Tony Robbins',cat:'Celebrity',type:'ENFJ 3w2',initials:'TR',note:'Peak-state catalyst who transforms audiences through emotional mobilization.'},{name:'Morpheus',cat:'Pop Culture',type:'ENFJ 1w2',initials:'Mo',note:'The archetypal mentor-catalyst who sees potential and calls it forth.'}],
    'ENFP':[{name:'Robin Williams',cat:'Celebrity',type:'ENFP 7w6',initials:'RW',note:'Ne/Fi in full expression — boundless creative range channeled through deep human warmth.'},{name:'Walt Disney',cat:'Historical',type:'ENFP 7w6',initials:'WD',note:'Visionary world-builder who created entirely new imaginative territories.'},{name:'Mark Twain',cat:'Historical',type:'ENFP 7w8',initials:'MT',note:'Restless adventurer whose warmth and wit captured the full range of American experience.'},{name:'Anne of Green Gables',cat:'Pop Culture',type:'ENFP 4w3',initials:'AG',note:'Ne/Fi archetype: imagination, warmth, and authentic self-expression against convention.'},{name:'Pippi Longstocking',cat:'Pop Culture',type:'ENFP 7w8',initials:'PL',note:'Joyful anarchist who refuses social constraint and lives entirely on her own terms.'},{name:'Carl Rogers',cat:'Historical',type:'ENFP 2w1',initials:'CR',note:'Founded person-centered therapy — the belief that human potential unfolds in genuine warmth.'},{name:'Ellen DeGeneres',cat:'Celebrity',type:'ENFP 7w6',initials:'ED',note:'Authentic entertainer who built connection through genuine warmth and irreverent humor.'},{name:'Elizabeth Bennet',cat:'Pop Culture',type:'ENFP 3w4',initials:'EB',note:'Witty, independent, emotionally perceptive — refuses to perform for social approval.'}]
  };

  // Default figures for types not in the map
  var defaultFigs = [
    {name:'Socrates',cat:'Historical',type:'Unknown',initials:'So',note:'Relentless questioner who pursued truth through dialogue and self-examination.'},
    {name:'Marcus Aurelius',cat:'Historical',type:'ISTJ 1w9',initials:'MA',note:'Philosopher-emperor who practiced disciplined self-governance under enormous pressure.'},
    {name:'Marie Curie',cat:'Historical',type:'INTJ 5w4',initials:'MC',note:'Pioneer scientist who combined systematic rigor with extraordinary personal determination.'},
    {name:'Atticus Finch',cat:'Pop Culture',type:'INFJ 1w2',initials:'AF',note:'The moral compass — principled, fair, and deeply committed to human dignity.'},
    {name:'Sherlock Holmes',cat:'Pop Culture',type:'INTP 5w6',initials:'SH',note:'Analytical detective who cuts through noise to essential truth.'},
    {name:'Tolkien',cat:'Historical',type:'INFJ 5w4',initials:'JT',note:'Visionary world-builder who created from a singular integrated imagination.'},
    {name:'Albert Camus',cat:'Historical',type:'INFP 4w5',initials:'AC',note:'Existentialist who combined philosophical seriousness with profound human warmth.'},
    {name:'Hannah Arendt',cat:'Historical',type:'INTP 5w6',initials:'HA',note:'Political philosopher who analyzed power, freedom, and human action with rare precision.'}
  ];

  var figures;
  if (typeof AnimusFigures !== 'undefined' && AnimusFigures.pickFigures) {
    figures = AnimusFigures.pickFigures(mbti, enn.type, enn.wing, 10);
  } else {
    figures = figsByType[mbti] || defaultFigs;
  }

  // Values — based on type
  var valuesByType = {
    'INTJ':['Intellectual Mastery','Autonomy','Strategic Excellence','Authentic Vision','Moral Integrity','Independence'],
    'INTP':['Logical Precision','Theoretical Depth','Intellectual Freedom','Epistemic Honesty','Originality','Competence'],
    'ENTJ':['Strategic Power','Organizational Excellence','Results','Leadership','Competence','Decisive Action'],
    'ENTP':['Intellectual Stimulation','Creative Freedom','Originality','Debate','Conceptual Range','Autonomy'],
    'INFJ':['Deep Meaning','Human Flourishing','Authenticity','Visionary Purpose','Integrity','Connection'],
    'INFP':['Authentic Self','Creative Expression','Deep Values','Moral Purity','Idealism','Inner Freedom'],
    'ENFJ':['Human Growth','Relational Depth','Shared Vision','Service','Authenticity','Community'],
    'ENFP':['Authentic Connection','Creative Freedom','Human Potential','Enthusiasm','Personal Growth','Meaning'],
    'ISTJ':['Duty','Reliability','Order','Competence','Tradition','Integrity'],
    'ISFJ':['Care','Devotion','Security','Community','Loyalty','Service'],
    'ESTJ':['Order','Standards','Results','Leadership','Accountability','Tradition'],
    'ESFJ':['Harmony','Care','Community','Belonging','Loyalty','Service'],
    'ISTP':['Mastery','Efficiency','Independence','Precision','Freedom','Pragmatism'],
    'ISFP':['Aesthetic Truth','Authentic Expression','Freedom','Compassion','Present Moment','Individual Integrity'],
    'ESTP':['Action','Impact','Skill','Freedom','Challenge','Boldness'],
    'ESFP':['Joy','Connection','Present Experience','Warmth','Creative Expression','Authenticity']
  };
  var values = valuesByType[mbti] || ['Authenticity','Excellence','Freedom','Depth','Growth','Integrity'];

  // Big5 — derived from actual cog scores
  var big5 = {
    Openness:        Math.round(data.cog['Ne']*0.35 + data.cog['Ni']*0.35 + data.cog['Ti']*0.15 + data.cog['Fi']*0.15),
    Conscientiousness:Math.round(data.cog['Te']*0.35 + data.cog['Si']*0.35 + data.cog['Fi']*0.15 + data.cog['Ni']*0.15),
    Extraversion:    Math.round(data.cog['Se']*0.3  + data.cog['Fe']*0.35 + data.cog['Ne']*0.35),
    Agreeableness:   Math.round(data.cog['Fe']*0.45 + data.cog['Fi']*0.3  + data.cog['Si']*0.25),
    Neuroticism:     Math.round((100-data.cog['Te'])*0.25 + (100-data.cog['Ti'])*0.25 + data.cog['Fi']*0.25 + (100-data.cog['Si'])*0.25)
  };

  var polX = data.polX||0, polY = data.polY||0;
  var polQuad = (typeof AnimusCross !== 'undefined' && AnimusCross.polQuadrant)
    ? AnimusCross.polQuadrant(polX, polY)
    : (polX>=0&&polY<0?'lib-right':polX>=0&&polY>=0?'auth-right':polX<0&&polY<0?'lib-left':'auth-left');
  var polCompare = (typeof AnimusCross !== 'undefined' && AnimusCross.buildPoliticalComparisons)
    ? AnimusCross.buildPoliticalComparisons(polX, polY)
    : {};
  var polNarr = {
    'lib-right':'Your economic and social positions combine to place you in the libertarian-right quadrant — favoring market freedom while skeptical of state authority over personal life.',
    'auth-right':'You combine market-oriented economics with a preference for social order, tradition, and strong institutions — a conservative synthesis that values both economic freedom and social cohesion.',
    'lib-left':'You combine economic progressivism with strong civil libertarianism — skeptical of both state power and concentrated private power, standing in the left-libertarian tradition.',
    'auth-left':'You favor collective economic management with strong institutional authority to enforce it — standing in the social democratic or democratic socialist tradition.'
  };
  var polIdeology = (polX>50&&polY<-30)?'Paleolibertarian / Classical Liberal':(polX>30&&polY<-10)?'Classical Liberal / Libertarian':(polX>10&&polY<-5)?'Centre-Right / Fusionist':(polX>30&&polY>20)?'National Conservative':(polX>10&&polY>10)?'Neoconservative':(polX<-50&&polY<-20)?'Left-Libertarian / Libertarian Socialist':(polX<-30&&polY<-10)?'Progressive Libertarian':(polX<-50&&polY>20)?'Democratic Socialist / Marxist':(polX<-20&&polY>10)?'Social Democrat':(polX<-10)?'Centre-Left':(polX>10)?'Centre-Right':'Centrist';

  var socionicsByMBTI = {INTJ:'LII',INTP:'ILI',ENTJ:'LSE',ENTP:'ILE',INFJ:'EII',INFP:'IEI',ENFJ:'ESE',ENFP:'IEE',ISTJ:'LSI',ISFJ:'ESI',ESTJ:'SLE',ESFJ:'SEE',ISTP:'SLI',ISFP:'SEI',ESTP:'LSE',ESFP:'SEE'};
  var keirseyByMBTI = {INTJ:'Rational',INTP:'Rational',ENTJ:'Rational',ENTP:'Rational',INFJ:'Idealist',INFP:'Idealist',ENFJ:'Idealist',ENFP:'Idealist',ISTJ:'Guardian',ISFJ:'Guardian',ESTJ:'Guardian',ESFJ:'Guardian',ISTP:'Artisan',ISFP:'Artisan',ESTP:'Artisan',ESFP:'Artisan'};

  return {
    mbtiName: mm.n,
    tagline: mm.t,
    cogNarrative: cogNarr,
    ennNarrative: 'Your Enneagram type '+enn.type+'w'+enn.wing+' (alongside '+mbti+') is driven by a core fear and desire that shapes major life decisions, even when invisible. The wing adds specific texture to how this motivation shows up day to day.'
      + (enn.tritype ? '\n\nYour tritype of '+enn.tritype+' reflects how your head, heart, and gut centers each operate — a fuller map of motivation than the core type alone.' : ''),
    attNarrative: 'Your attachment pattern shapes how you seek and experience closeness — the invisible architecture that determines what feels safe, what feels threatening, and what you do when vulnerability is required.',
    phiNarrative: 'Your philosophical alignment toward '+phi.replace('PH_','')+' reflects a structural orientation that goes beyond intellectual preference — it shapes how you interpret knowledge, ethics, and the nature of reality.',
    aloneDesc: aloneD,
    socialDesc: socialD,
    shadowDesc: shadowD,
    figures: figures,
    values: values,
    big5: big5,
    politicalNarrative: polNarr[polQuad]+' Your compass position (X='+polX+', Y='+polY+') comes from your political answers. As '+mbti+' with Enneagram '+enn.type+'w'+enn.wing+', that placement fits how this type pattern often maps values onto economics and institutions — your scores determine the result, not the label alone.',
    politicalIdeology: polIdeology,
    politicalIdeologyDesc: 'This position reflects a specific tradition with its own intellectual history, strengths, and genuine blind spots. Explore the political tab for a full analysis.',
    politicalStrengths: 'This position has genuine intellectual coherence and real historical achievements. Its strongest moments tend to come when it operates within its core assumptions about human nature and the proper role of institutions.',
    politicalWeaknesses: 'Every political position has blind spots that become visible under pressure. This position is most vulnerable when its foundational assumptions about human nature or institutional behavior prove incorrect in specific contexts.',
    politicalThinkers: polCompare.politicalThinkers || ['Key thinkers in this tradition have shaped its most coherent arguments.'],
    similarCountries: polCompare.similarCountries || ['Country comparisons are derived from your economic and social axes.'],
    similarPoliticians: polCompare.similarPoliticians || ['Politician comparisons are derived from your economic and social axes.'],
    similarParties: polCompare.similarParties || ['Party comparisons are derived from your economic and social axes.'],
    socionics: socionicsByMBTI[mbti] || '—',
    keirsey: keirseyByMBTI[mbti] || 'Rational'
  };
}

  g.ProfileNarratives = { buildFallbackNarrative: buildFallbackNarrative };
})(typeof window !== 'undefined' ? window : globalThis);
