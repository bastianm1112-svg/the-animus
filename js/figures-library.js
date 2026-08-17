/** Canonical similar-figure library — fixed typings per person */
(function (g) {
  'use strict';
  var CATALOG = [
    {mbti:"INTJ",name:"Friedrich Nietzsche",cat:"Historical",e:5,w:4,note:"Lone philosopher who built systems from interior vision."},
    {mbti:"INTJ",name:"Nikola Tesla",cat:"Historical",e:5,w:6,note:"Inventor driven by internal models of possibility."},
    {mbti:"INTJ",name:"Greta Thunberg",cat:"Celebrity",e:1,w:2,note:"Principled advocate with long-horizon moral focus."},
    {mbti:"INTJ",name:"Tywin Lannister",cat:"Pop Culture",e:8,w:1,note:"Strategic authority optimizing systems for control."},
    {mbti:"INTJ",name:"Lisbeth Salander",cat:"Pop Culture",e:5,w:4,note:"Independent analyst operating outside institutions."},
    {mbti:"INTJ",name:"Hannah Arendt",cat:"Historical",e:5,w:6,note:"Political thinker parsing power with conceptual rigor."},
    {mbti:"INTJ",name:"Michelle Obama",cat:"Celebrity",e:1,w:2,note:"Disciplined leader pairing vision with execution."},
    {mbti:"INTJ",name:"Marcus Aurelius",cat:"Historical",e:1,w:9,note:"Stoic emperor structuring duty into daily practice."},
    {mbti:"INTP",name:"Richard Feynman",cat:"Historical",e:5,w:7,note:"Playful theorist who stress-tests ideas experimentally."},
    {mbti:"INTP",name:"Marie Curie",cat:"Historical",e:5,w:6,note:"Pioneer researcher pursuing truth past convention."},
    {mbti:"INTP",name:"Bill Gates (early)",cat:"Celebrity",e:5,w:6,note:"Systems thinker optimizing abstractions at scale."},
    {mbti:"INTP",name:"Rick Sanchez",cat:"Pop Culture",e:5,w:7,note:"Cynical genius exploring ideas without social filter."},
    {mbti:"INTP",name:"Neo (Matrix)",cat:"Pop Culture",e:5,w:4,note:"Questions reality until underlying structure appears."},
    {mbti:"INTP",name:"Ada Lovelace",cat:"Historical",e:5,w:4,note:"First programmer — logic as creative medium."},
    {mbti:"INTP",name:"Jesse Pinkman",cat:"Pop Culture",e:6,w:7,note:"Loyal skeptic who learns through lived experiment."},
    {mbti:"INTP",name:"Socrates",cat:"Historical",e:5,w:6,note:"Dialectician dismantling assumptions through questions."},
    {mbti:"ENTJ",name:"Alexander the Great",cat:"Historical",e:8,w:7,note:"Conquered through strategic tempo and personal will."},
    {mbti:"ENTJ",name:"Sheryl Sandberg",cat:"Celebrity",e:3,w:2,note:"Executive operator scaling organizations decisively."},
    {mbti:"ENTJ",name:"Miranda Priestly",cat:"Pop Culture",e:1,w:2,note:"Demanding commander with exacting standards."},
    {mbti:"ENTJ",name:"Erwin Smith",cat:"Pop Culture",e:1,w:9,note:"Commander who sacrifices for strategic objectives."},
    {mbti:"ENTJ",name:"Angela Merkel",cat:"Historical",e:1,w:6,note:"Pragmatic institutional leader under pressure."},
    {mbti:"ENTJ",name:"Kamala Harris",cat:"Celebrity",e:3,w:2,note:"Prosecutorial communicator driving outcomes."},
    {mbti:"ENTJ",name:"Tony Soprano",cat:"Pop Culture",e:8,w:9,note:"Organizational patriarch balancing power and family."},
    {mbti:"ENTJ",name:"Condoleezza Rice",cat:"Historical",e:3,w:2,note:"Strategic diplomat executing long-range policy."},
    {mbti:"ENTP",name:"Mark Twain",cat:"Historical",e:7,w:8,note:"Satirical mind reframing culture through wit."},
    {mbti:"ENTP",name:"Ryan Reynolds",cat:"Celebrity",e:7,w:8,note:"Improvisational humor as social intelligence."},
    {mbti:"ENTP",name:"The Doctor (Who)",cat:"Pop Culture",e:7,w:8,note:"Restless explorer generating solutions on the fly."},
    {mbti:"ENTP",name:"Richard Feynman",cat:"Historical",e:7,w:8,note:"Curious provocateur in physics and teaching."},
    {mbti:"ENTP",name:"Tom Hiddleston",cat:"Celebrity",e:4,w:3,note:"Charismatic performer with quick conceptual range."},
    {mbti:"ENTP",name:"Fred from Scooby-Doo",cat:"Pop Culture",e:7,w:6,note:"Talkative idea-generator in chaotic teams."},
    {mbti:"ENTP",name:"Catherine the Great",cat:"Historical",e:3,w:8,note:"Reformer who challenged orthodoxy with bold policy."},
    {mbti:"ENTP",name:"Weird Al Yankovic",cat:"Celebrity",e:7,w:6,note:"Recombines culture through playful invention."},
    {mbti:"INFJ",name:"Dostoevsky",cat:"Historical",e:4,w:5,note:"Novelist of moral depth and inner conflict."},
    {mbti:"INFJ",name:"Carl Jung",cat:"Historical",e:4,w:5,note:"Explorer of symbolic inner life and meaning."},
    {mbti:"INFJ",name:"Lady Gaga",cat:"Celebrity",e:4,w:3,note:"Artistic channel for identity and empathy."},
    {mbti:"INFJ",name:"Aragorn",cat:"Pop Culture",e:1,w:9,note:"Reluctant king guided by duty and vision."},
    {mbti:"INFJ",name:"Simone Weil",cat:"Historical",e:4,w:5,note:"Mystic intellectual serving truth through sacrifice."},
    {mbti:"INFJ",name:"Rosa Parks",cat:"Historical",e:1,w:9,note:"Quiet moral courage shifting collective history."},
    {mbti:"INFJ",name:"Amélie Poulain",cat:"Pop Culture",e:9,w:1,note:"Subtle caretaker improving lives in the margins."},
    {mbti:"INFJ",name:"Jordan Peterson",cat:"Celebrity",e:1,w:6,note:"Maps meaning and responsibility for followers."},
    {mbti:"INFP",name:"Kurt Cobain",cat:"Celebrity",e:4,w:5,note:"Raw authenticity as artistic identity."},
    {mbti:"INFP",name:"Princess Diana",cat:"Celebrity",e:2,w:3,note:"Compassionate icon challenging stiff institutions."},
    {mbti:"INFP",name:"Frodo Baggins",cat:"Pop Culture",e:9,w:1,note:"Moral endurance through quiet conviction."},
    {mbti:"INFP",name:"Hayao Miyazaki",cat:"Celebrity",e:4,w:5,note:"Gentle worlds rooted in ecological values."},
    {mbti:"INFP",name:"John Lennon",cat:"Celebrity",e:4,w:5,note:"Idealist artist imagining collective peace."},
    {mbti:"INFP",name:"Luna Lovegood",cat:"Pop Culture",e:4,w:5,note:"Unwavering inner truth despite social oddity."},
    {mbti:"INFP",name:"Franz Kafka",cat:"Historical",e:4,w:5,note:"Alienation rendered as symbolic literature."},
    {mbti:"INFP",name:"Spike Lee",cat:"Celebrity",e:4,w:5,note:"Storyteller of identity and moral complexity."},
    {mbti:"ENFJ",name:"Nelson Mandela",cat:"Historical",e:1,w:2,note:"Reconciler who held moral vision over decades."},
    {mbti:"ENFJ",name:"Mufasa",cat:"Pop Culture",e:1,w:2,note:"Protective leader modeling responsibility."},
    {mbti:"ENFJ",name:"Dwayne Johnson",cat:"Celebrity",e:3,w:2,note:"Charismatic motivator energizing groups."},
    {mbti:"ENFJ",name:"Leslie Knope",cat:"Pop Culture",e:2,w:3,note:"Relentless community builder through service."},
    {mbti:"ENFJ",name:"Pope John Paul II",cat:"Historical",e:2,w:1,note:"Pastoral figure mobilizing global conscience."},
    {mbti:"ENFJ",name:"Daenerys Targaryen",cat:"Pop Culture",e:2,w:3,note:"Charismatic liberator with growing shadow."},
    {mbti:"ENFJ",name:"Brene Brown",cat:"Celebrity",e:2,w:3,note:"Researcher teaching vulnerability as strength."},
    {mbti:"ENFJ",name:"Coach Carter",cat:"Pop Culture",e:1,w:2,note:"Demanding mentor framing discipline as love."},
    {mbti:"ENFP",name:"Walt Disney",cat:"Historical",e:7,w:6,note:"Imaginative builder of shared wonder."},
    {mbti:"ENFP",name:"Robert Downey Jr.",cat:"Celebrity",e:7,w:8,note:"Wit, warmth, and reinvention on display."},
    {mbti:"ENFP",name:"Anna (Frozen)",cat:"Pop Culture",e:7,w:6,note:"Optimistic connector thawing isolation."},
    {mbti:"ENFP",name:"Russell Brand",cat:"Celebrity",e:7,w:8,note:"Performer-activist blending humor and ideals."},
    {mbti:"ENFP",name:"Phoebe Buffay",cat:"Pop Culture",e:7,w:6,note:"Unfiltered authenticity in social life."},
    {mbti:"ENFP",name:"Miles Morales",cat:"Pop Culture",e:7,w:6,note:"Youthful creativity meeting responsibility."},
    {mbti:"ENFP",name:"Coco Chanel",cat:"Historical",e:3,w:4,note:"Reinvented style as personal liberation."},
    {mbti:"ENFP",name:"Jack Sparrow",cat:"Pop Culture",e:7,w:8,note:"Improvisational survivor reading the moment."},
    {mbti:"ISTJ",name:"George Washington",cat:"Historical",e:1,w:9,note:"Institutional founder through disciplined duty."},
    {mbti:"ISTJ",name:"Angela Merkel",cat:"Historical",e:6,w:5,note:"Steady steward of procedural stability."},
    {mbti:"ISTJ",name:"Hermione Granger",cat:"Pop Culture",e:1,w:2,note:"Preparedness and rules as moral backbone."},
    {mbti:"ISTJ",name:"Denzel Washington",cat:"Celebrity",e:1,w:9,note:"Craft mastery through consistent reliability."},
    {mbti:"ISTJ",name:"Inspector Lestrade",cat:"Pop Culture",e:6,w:5,note:"Procedure-first investigator in chaos."},
    {mbti:"ISTJ",name:"Queen Elizabeth II",cat:"Historical",e:1,w:9,note:"Symbol of continuity and obligation."},
    {mbti:"ISTJ",name:"Mike Ehrmantraut",cat:"Pop Culture",e:6,w:5,note:"Pragmatic enforcer of professional codes."},
    {mbti:"ISTJ",name:"Warren Buffett",cat:"Celebrity",e:6,w:5,note:"Long-horizon investor trusting proven systems."},
    {mbti:"ISFJ",name:"Florence Nightingale",cat:"Historical",e:2,w:1,note:"Reformed care through meticulous service."},
    {mbti:"ISFJ",name:"Beyoncé (caretaker role)",cat:"Celebrity",e:2,w:3,note:"Protects circle while performing at elite level."},
    {mbti:"ISFJ",name:"Cinderella",cat:"Pop Culture",e:2,w:1,note:"Quiet resilience and kindness under neglect."},
    {mbti:"ISFJ",name:"Steve Rogers (pre-serum)",cat:"Pop Culture",e:6,w:2,note:"Duty and loyalty before transformation."},
    {mbti:"ISFJ",name:"Mr. Rogers",cat:"Celebrity",e:2,w:1,note:"Gentle teacher making children feel safe."},
    {mbti:"ISFJ",name:"Pam Beesly",cat:"Pop Culture",e:2,w:1,note:"Stabilizing warmth in chaotic workplaces."},
    {mbti:"ISFJ",name:"George Bailey",cat:"Pop Culture",e:2,w:1,note:"Community pillar sacrificing personal ambition."},
    {mbti:"ISFJ",name:"Kristin Chenoweth",cat:"Celebrity",e:2,w:3,note:"Warmth and precision in performance."},
    {mbti:"ESTJ",name:"Henry Ford",cat:"Historical",e:3,w:2,note:"Scaled production through standardized systems."},
    {mbti:"ESTJ",name:"Judge Judy",cat:"Celebrity",e:1,w:2,note:"Direct adjudicator enforcing clear standards."},
    {mbti:"ESTJ",name:"Dwight Schrute",cat:"Pop Culture",e:6,w:5,note:"Rule-bound operator seeking rank."},
    {mbti:"ESTJ",name:"Lyndon B. Johnson",cat:"Historical",e:8,w:7,note:"Legislative arm-twister delivering outcomes."},
    {mbti:"ESTJ",name:"Claire Underwood",cat:"Pop Culture",e:3,w:4,note:"Executive strategist behind power."},
    {mbti:"ESTJ",name:"Vince Lombardi",cat:"Historical",e:8,w:7,note:"Demanding coach equating winning with discipline."},
    {mbti:"ESTJ",name:"Ross Geller",cat:"Pop Culture",e:1,w:6,note:"Structure and correctness as comfort zone."},
    {mbti:"ESTJ",name:"Eleanor Roosevelt (executive)",cat:"Historical",e:1,w:2,note:"Institutional reform through persistent organization."},
    {mbti:"ESFJ",name:"Taylor Swift (community)",cat:"Celebrity",e:2,w:3,note:"Maintains intimate fan belonging at scale."},
    {mbti:"ESFJ",name:"Jennifer Garner",cat:"Celebrity",e:2,w:1,note:"Relatable warmth in family and charity roles."},
    {mbti:"ESFJ",name:"Monica Geller",cat:"Pop Culture",e:2,w:1,note:"Host whose love language is organized care."},
    {mbti:"ESFJ",name:"Dolly Parton",cat:"Celebrity",e:2,w:3,note:"Generous storyteller anchoring community."},
    {mbti:"ESFJ",name:"Marge Simpson",cat:"Pop Culture",e:2,w:1,note:"Domestic glue holding chaos together."},
    {mbti:"ESFJ",name:"Hugh Jackman",cat:"Celebrity",e:2,w:3,note:"Affable performer prioritizing group morale."},
    {mbti:"ESFJ",name:"Boromir",cat:"Pop Culture",e:6,w:2,note:"Protector driven by duty to people."},
    {mbti:"ESFJ",name:"Tom Hanks",cat:"Celebrity",e:2,w:1,note:"America’s approachable moral everyman."},
    {mbti:"ISTP",name:"Clint Eastwood",cat:"Celebrity",e:8,w:9,note:"Economy of motion and taciturn competence."},
    {mbti:"ISTP",name:"Michael Jordan",cat:"Celebrity",e:8,w:7,note:"Cool mastery under competitive pressure."},
    {mbti:"ISTP",name:"Arya Stark",cat:"Pop Culture",e:8,w:7,note:"Pragmatic survivor learning skills in motion."},
    {mbti:"ISTP",name:"James Bond",cat:"Pop Culture",e:8,w:7,note:"Tactical improviser in physical crisis."},
    {mbti:"ISTP",name:"Bruce Lee",cat:"Historical",e:8,w:7,note:"Embodied precision and adaptive fighting philosophy."},
    {mbti:"ISTP",name:"Boba Fett",cat:"Pop Culture",e:8,w:9,note:"Independent operator solving problems alone."},
    {mbti:"ISTP",name:"Zoe Washburne",cat:"Pop Culture",e:8,w:9,note:"Calm mechanic-pilot in chaos."},
    {mbti:"ISTP",name:"Bear Grylls",cat:"Celebrity",e:8,w:7,note:"Survival intelligence applied in real terrain."},
    {mbti:"ISFP",name:"David Bowie",cat:"Celebrity",e:4,w:3,note:"Aesthetic reinvention as authentic expression."},
    {mbti:"ISFP",name:"Frida Kahlo",cat:"Historical",e:4,w:5,note:"Pain and identity rendered as visual truth."},
    {mbti:"ISFP",name:"Zuko",cat:"Pop Culture",e:4,w:3,note:"Redemption arc through inner moral struggle."},
    {mbti:"ISFP",name:"Lana Del Rey",cat:"Celebrity",e:4,w:5,note:"Mood and beauty as emotional vocabulary."},
    {mbti:"ISFP",name:"Thranduil",cat:"Pop Culture",e:4,w:5,note:"Sensory refinement guarding private values."},
    {mbti:"ISFP",name:"Bob Ross",cat:"Celebrity",e:9,w:1,note:"Gentle presence making art feel safe."},
    {mbti:"ISFP",name:"Jimin",cat:"Celebrity",e:4,w:3,note:"Performance as vulnerable artistry."},
    {mbti:"ISFP",name:"Hiccup",cat:"Pop Culture",e:4,w:5,note:"Quiet innovator honoring difference."},
    {mbti:"ESTP",name:"Donald Trump",cat:"Celebrity",e:8,w:7,note:"Bold operator thriving in public conflict."},
    {mbti:"ESTP",name:"Madonna",cat:"Celebrity",e:7,w:8,note:"Reinvents persona to command the moment."},
    {mbti:"ESTP",name:"Han Solo",cat:"Pop Culture",e:7,w:8,note:"Improviser who wins through nerve and charm."},
    {mbti:"ESTP",name:"Tom Cruise",cat:"Celebrity",e:3,w:7,note:"Kinetic performer pushing physical limits."},
    {mbti:"ESTP",name:"Evel Knievel",cat:"Celebrity",e:8,w:7,note:"Risk as spectacle and identity."},
    {mbti:"ESTP",name:"James Bond (Craig)",cat:"Pop Culture",e:8,w:7,note:"Physical intelligence in high stakes."},
    {mbti:"ESTP",name:"Rihanna",cat:"Celebrity",e:7,w:8,note:"Trend setter moving at market speed."},
    {mbti:"ESTP",name:"Tyler Durden",cat:"Pop Culture",e:8,w:7,note:"Charismatic disruptor of complacency."},
    {mbti:"ESFP",name:"Marilyn Monroe",cat:"Celebrity",e:7,w:6,note:"Magnetic presence channeling vulnerability."},
    {mbti:"ESFP",name:"Will Smith",cat:"Celebrity",e:7,w:6,note:"Charisma and optimism as public craft."},
    {mbti:"ESFP",name:"Peeta Mellark",cat:"Pop Culture",e:2,w:3,note:"Warmth and artistry under pressure."},
    {mbti:"ESFP",name:"Miley Cyrus",cat:"Celebrity",e:7,w:8,note:"Performs authenticity in real time."},
    {mbti:"ESFP",name:"Donkey (Shrek)",cat:"Pop Culture",e:7,w:6,note:"Social energy dissolving tension."},
    {mbti:"ESFP",name:"Sonic the Hedgehog",cat:"Pop Culture",e:7,w:8,note:"Speed, play, and restless motion."},
    {mbti:"ESFP",name:"Harry Styles",cat:"Celebrity",e:7,w:6,note:"Joyful self-expression inviting belonging."},
    {mbti:"ESFP",name:"Penny (Big Bang)",cat:"Pop Culture",e:7,w:6,note:"Social intuition grounding intellectual circles."},
    {mbti:"INTJ",name:"Friedrich Nietzsche",cat:"Historical",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTJ",name:"Isaac Newton",cat:"Historical",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTJ",name:"Elon Musk",cat:"Celebrity",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTJ",name:"Walter White",cat:"Pop Culture",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTJ",name:"Batman",cat:"Pop Culture",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTJ",name:"Hannibal Lecter",cat:"Pop Culture",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTJ",name:"Carl Jung",cat:"Historical",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTJ",name:"Ayn Rand",cat:"Historical",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTP",name:"Albert Einstein",cat:"Historical",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTP",name:"Charles Darwin",cat:"Historical",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTP",name:"Immanuel Kant",cat:"Historical",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTP",name:"House (MD)",cat:"Pop Culture",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTP",name:"Sherlock Holmes",cat:"Pop Culture",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTP",name:"L (Death Note)",cat:"Pop Culture",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTP",name:"Blaise Pascal",cat:"Historical",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"INTP",name:"Kurt Gödel",cat:"Historical",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTJ",name:"Napoleon Bonaparte",cat:"Historical",e:7,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTJ",name:"Julius Caesar",cat:"Historical",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTJ",name:"Steve Jobs",cat:"Celebrity",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTJ",name:"Frank Underwood",cat:"Pop Culture",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTJ",name:"Tywin Lannister",cat:"Pop Culture",e:9,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTJ",name:"Margaret Thatcher",cat:"Historical",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTJ",name:"Gordon Ramsay",cat:"Celebrity",e:7,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTJ",name:"Jack Welch",cat:"Historical",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTP",name:"Leonardo da Vinci",cat:"Historical",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTP",name:"Voltaire",cat:"Historical",e:8,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTP",name:"Robert Downey Jr.",cat:"Celebrity",e:8,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTP",name:"Tony Stark",cat:"Pop Culture",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTP",name:"The Joker (Ledger)",cat:"Pop Culture",e:8,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTP",name:"Socrates",cat:"Historical",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTP",name:"Benjamin Franklin",cat:"Historical",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENTP",name:"Mark Twain",cat:"Historical",e:8,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFJ",name:"Carl Jung",cat:"Historical",e:5,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFJ",name:"Mahatma Gandhi",cat:"Historical",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFJ",name:"Nelson Mandela",cat:"Historical",e:9,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFJ",name:"Atticus Finch",cat:"Pop Culture",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFJ",name:"Yoda",cat:"Pop Culture",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFJ",name:"Martin Luther King Jr.",cat:"Historical",e:1,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFJ",name:"Dostoevsky",cat:"Historical",e:5,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFJ",name:"Tolkien",cat:"Historical",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFP",name:"J.R.R. Tolkien",cat:"Historical",e:5,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFP",name:"Virginia Woolf",cat:"Historical",e:5,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFP",name:"Albert Camus",cat:"Historical",e:5,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFP",name:"Frodo Baggins",cat:"Pop Culture",e:1,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFP",name:"Anne Frank",cat:"Historical",e:3,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFP",name:"Sylvia Plath",cat:"Historical",e:5,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFP",name:"William Shakespeare",cat:"Historical",e:5,w:NaN,note:"Archetypal parallel."},
    {mbti:"INFP",name:"Vincent van Gogh",cat:"Historical",e:5,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFJ",name:"Martin Luther King Jr.",cat:"Historical",e:1,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFJ",name:"Oprah Winfrey",cat:"Celebrity",e:3,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFJ",name:"Barack Obama",cat:"Historical",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFJ",name:"Michael Scott",cat:"Pop Culture",e:3,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFJ",name:"Emma Woodhouse",cat:"Pop Culture",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFJ",name:"Nelson Mandela",cat:"Historical",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFJ",name:"Tony Robbins",cat:"Celebrity",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFJ",name:"Morpheus",cat:"Pop Culture",e:2,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFP",name:"Robin Williams",cat:"Celebrity",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFP",name:"Walt Disney",cat:"Historical",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFP",name:"Mark Twain",cat:"Historical",e:8,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFP",name:"Anne of Green Gables",cat:"Pop Culture",e:3,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFP",name:"Pippi Longstocking",cat:"Pop Culture",e:8,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFP",name:"Carl Rogers",cat:"Historical",e:1,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFP",name:"Ellen DeGeneres",cat:"Celebrity",e:6,w:NaN,note:"Archetypal parallel."},
    {mbti:"ENFP",name:"Elizabeth Bennet",cat:"Pop Culture",e:4,w:NaN,note:"Archetypal parallel."},
    {mbti:"ESTP",name:"Serena Williams",cat:"Sports",e:8,w:7,note:"Competitive presence under elite pressure.",popularity:5,dataStatus:"estimated"},
    {mbti:"ESFP",name:"Lionel Messi",cat:"Sports",e:9,w:1,note:"Quiet craft expressed through play.",popularity:5,dataStatus:"estimated"},
    {mbti:"ESTP",name:"Cristiano Ronaldo",cat:"Sports",e:3,w:8,note:"Relentless self-demand and showmanship.",popularity:5,dataStatus:"estimated"},
    {mbti:"ISTP",name:"Michael Jordan",cat:"Sports",e:8,w:3,note:"Competitive intensity channeled into craft.",popularity:5,dataStatus:"estimated"},
    {mbti:"ESFP",name:"Simone Biles",cat:"Sports",e:3,w:2,note:"Precision and presence at the highest stage.",popularity:5,dataStatus:"estimated"},
    {mbti:"ESTP",name:"Usain Bolt",cat:"Sports",e:7,w:8,note:"Explosive performance with public ease.",popularity:4,dataStatus:"estimated"},
    {mbti:"ISFP",name:"Naomi Osaka",cat:"Sports",e:4,w:5,note:"Private values under public competition.",popularity:4,dataStatus:"estimated"},
    {mbti:"ESTJ",name:"Tom Brady",cat:"Sports",e:3,w:1,note:"Longevity through disciplined systems.",popularity:5,dataStatus:"estimated"},
    {mbti:"ENFJ",name:"Megan Rapinoe",cat:"Sports",e:8,w:7,note:"Public advocacy alongside elite play.",popularity:4,dataStatus:"estimated"},
    {mbti:"ISTP",name:"Kobe Bryant",cat:"Sports",e:3,w:8,note:"Obsessive craft and competitive standard.",popularity:5,dataStatus:"estimated"}
  ];
  CATALOG.forEach(function (f) {
    if (!f.popularity) f.popularity = 3;
    if (!f.dataStatus) f.dataStatus = 'estimated';
    if (f.cat === 'Celebrity') f.cat = 'Entertainment';
    if (f.cat === 'Pop Culture') f.cat = 'Other';
  });
  function initials(name) {
    var parts = String(name || '').replace(/\([^)]*\)/g, '').split(/\s+/).filter(Boolean);
    if (!parts.length) return '??';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatFigure(fig) {
    return {
      name: fig.name,
      cat: fig.cat,
      type: fig.mbti + (Number.isFinite(Number(fig.e))
        ? (' ' + fig.e + (Number.isFinite(Number(fig.w)) ? 'w' + fig.w : ''))
        : ''),
      initials: initials(fig.name),
      note: fig.note,
      popularity: fig.popularity || 3,
      dataStatus: fig.dataStatus || 'estimated'
    };
  }

  function scoreFigure(fig, mbti, ennType, ennWing) {
    var s = 0;
    if (fig.mbti !== mbti) return -1;
    s += 40;
    if (String(fig.e) === String(ennType)) s += 35;
    else if (Math.abs(parseInt(fig.e, 10) - parseInt(ennType, 10)) === 1) s += 12;
    if (Number.isFinite(Number(fig.w))) {
      if (String(fig.w) === String(ennWing)) s += 18;
      else if (Math.abs(parseInt(fig.w, 10) - parseInt(ennWing, 10)) === 1) s += 6;
    }
    s += (fig.popularity || 3) * 2;
    return s;
  }

  function pickFigures(mbti, ennType, ennWing, limit) {
    mbti = String(mbti || '').toUpperCase();
    ennType = String(ennType || '9').replace(/\D/g, '') || '9';
    ennWing = String(ennWing || '1').replace(/\D/g, '') || '1';
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
    var cats = { Historical: 0, Entertainment: 0, Other: 0, Sports: 0, Business: 0, Political: 0, Celebrity: 0, 'Pop Culture': 0 };
    var quotas = { Historical: 2, Entertainment: 2, Other: 2, Sports: 2, Business: 1, Political: 1, Celebrity: 2, 'Pop Culture': 2 };

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
    formatFigure: formatFigure,
    categories: ['Historical', 'Sports', 'Entertainment', 'Business', 'Political', 'Other']
  };
})(typeof window !== 'undefined' ? window : globalThis);
