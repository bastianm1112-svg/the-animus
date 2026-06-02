const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync(require('path').join(__dirname, '../js/psyche-questions.js'), 'utf8');
const ctx = vm.createContext({ window: {} });
vm.runInContext(code + '\n;', ctx);
const Q = ctx.window.AnimusQuestions.Q;
const ES = ctx.window.AnimusQuestions.ES;
let mc = 0;
let s = 0;
let missQ = 0;
let missChoices = 0;
Q.forEach(function (q) {
  if (q.type === 'mc') mc++;
  else s++;
  if (!ES[q.t] && !q.es_t) missQ++;
  if (q.type === 'mc' && q.choices) {
    q.choices.forEach(function (c) {
      if (!c.es_t) missChoices++;
    });
  }
});
console.log('questions', Q.length, 'mc', mc, 'scale', s);
console.log('missing question ES', missQ);
console.log('missing choice es_t', missChoices);
