/* Neutralize leading wording + add reverse keys. Applied after the bank loads. */
(function (g) {
  'use strict';
  if (!g.AnimusQuestions || !g.AnimusQuestions.Q) return;
  var Q = g.AnimusQuestions.Q;
  Q.forEach(function (q, i) {
    if (!q.id) q.id = 'q' + i;
  });

  var rewrites = {
    'Ideas converge for me into one unified insight rather than remaining as many separate options.': {
      t: 'I usually end up with one main interpretation of a situation.',
      rev: false
    },
    'I often explore multiple hypotheses simultaneously rather than committing to one.': {
      t: 'I keep several possible explanations in play at the same time.',
      rev: false
    },
    'I build my own internal framework for understanding topics rather than relying on what experts say.': {
      t: 'I like to assemble my own working model of a topic.',
      rev: false
    },
    'I prefer to figure things out independently rather than asking for help.': {
      t: 'I usually try to work a problem through on my own first.',
      rev: false
    },
    'I find it easy to make decisions and move on rather than second-guessing myself.': {
      t: 'Once I decide, I tend not to reopen the choice.',
      rev: false
    },
    'I prefer having clear metrics and goals rather than working toward vague ideals.': {
      t: 'I like goals that can be checked against a concrete target.',
      rev: false
    },
    'I tend to go along with others rather than assert my own preferences.': {
      t: 'In groups I often match what others already seem to want.',
      rev: false
    },
    'Individuals should create their own values rather than inherit them from tradition or consensus.': {
      t: 'People should put more weight on personally chosen values than on inherited ones.',
      rev: false
    },
    'I judge ideas by their practical consequences rather than their theoretical elegance.': {
      t: 'I judge ideas mainly by what they do in practice.',
      rev: false
    },
    'I prefer handling problems alone rather than turning to others for support.': {
      t: 'When something is hard, I usually handle it without asking for support.',
      rev: false
    },
    'I bounce back from setbacks quickly and prefer to keep things light rather than heavy.': {
      t: 'After a setback I return to a lighter mood fairly quickly.',
      rev: false
    },
    'I process emotions externally and talk through my feelings rather than sitting with them alone.': {
      t: 'I usually understand my feelings better after talking them out.',
      rev: false
    },
    'I prefer having one deep, all-encompassing vision rather than multiple open possibilities.': {
      t: 'I work from one main picture of where things should go.',
      rev: false
    },
    'I prefer exploring many possibilities at once rather than committing to a single path.': {
      t: 'I like keeping several paths open at once.',
      rev: false
    },
    'I\'m at my best when taking decisive action rather than ruminating or strategizing.': {
      t: 'I am more effective when I act soon and adjust later.',
      rev: false
    },
    'I prefer to act and correct course if needed rather than wait until everything is certain.': {
      t: 'I would rather start and adjust than wait for full certainty.',
      rev: false
    },
    'I find long periods of solitude genuinely restorative rather than uncomfortable.': {
      t: 'Long stretches alone usually leave me feeling restored.',
      rev: false
    }
  };

  Q.forEach(function (q) {
    var rw = q.t && rewrites[q.t];
    if (rw) {
      q.t = rw.t;
      if (rw.rev) q.rev = true;
    }
  });

  var choiceRewrites = {
    'Focused on who it affects rather than whether it\'s technically correct': 'Focused on who it affects, not only on whether it is technically correct',
    'Focus on being warm and connecting rather than impressive': 'Focus on being warm and connecting, not on looking impressive',
    'Activated by doing and physical engagement rather than thinking': 'Activated by doing and physical engagement more than by thinking',
    'Feel hurt but pull back rather than reaching out': 'Feel hurt and pull back instead of reaching out'
  };
  Q.forEach(function (q) {
    if (!q.choices) return;
    q.choices.forEach(function (c) {
      if (c.t && choiceRewrites[c.t]) c.t = choiceRewrites[c.t];
    });
  });

  var reverseTexts = {
    'I trust my gut convictions even when I cannot articulate a logical basis for them.': true,
    'I care more about whether an idea is logically consistent than whether it produces results.': true,
    'Authenticity matters more to me than social harmony — I\'d rather be honest than liked.': true,
    'I tend to take charge in group settings, especially when things are disorganized.': true,
    'I prefer familiar routines and environments over new unpredictable ones.': true,
    'I trust my instincts and act in the moment without needing to plan everything in advance.': true,
    'I need frequent reassurance that others value and care about me.': true,
    'When people get too close, I feel a strong urge to create distance.': true,
    'I am naturally optimistic and energetic — I move quickly between interests and activities.': true
  };
  Q.forEach(function (q) {
    if (q.type === 's' && reverseTexts[q.t]) q.rev = true;
  });

  var revCount = 0;
  Q.forEach(function (q) {
    if (q.type === 's' && q.sec === 'Cognitive' && /Disagree|Agree|like me/i.test((q.lo || '') + (q.hi || ''))) {
      if (!q.rev && revCount < 16 && (q.fn === 'Ni' || q.fn === 'Ti' || q.fn === 'Ne' || q.fn === 'Fi')) {
        if (Q.indexOf(q) % 3 === 0) {
          q.rev = true;
          revCount++;
        }
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
