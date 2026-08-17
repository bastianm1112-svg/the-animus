/* Extra reverse-keyed items used by Quick + full banks. Neutral wording. */
(function (g) {
  'use strict';
  var extra = [
    { id: 'qk-ni-r1', sec: 'Cognitive', fn: 'Ni', t: 'I usually stay with several competing readings of a situation for a long time.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-ne-r1', sec: 'Cognitive', fn: 'Ne', t: 'Once I pick a direction, I prefer not to keep generating extra options.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-ti-r1', sec: 'Cognitive', fn: 'Ti', t: 'I am comfortable using a trusted explanation without rebuilding it from scratch.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-te-r1', sec: 'Cognitive', fn: 'Te', t: 'I am fine letting a messy process continue if people seem content.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-fi-r1', sec: 'Cognitive', fn: 'Fi', t: 'I often set my personal reaction aside so a group can stay aligned.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-fe-r1', sec: 'Cognitive', fn: 'Fe', t: 'I can ignore the mood in a room if the task still needs doing.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-si-r1', sec: 'Cognitive', fn: 'Si', t: 'I get restless when a week looks too similar to the last one.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-se-r1', sec: 'Cognitive', fn: 'Se', t: 'I would rather map a situation first than jump into the physical details.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-at-r1', sec: 'Attachment', fn: 'AT_SEC', t: 'I often scan for signs that people might pull away.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-at-r2', sec: 'Attachment', fn: 'AT_ANX', t: 'I can sit with uncertainty in a relationship without seeking extra contact.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-pc-r1', sec: 'Politics', fn: 'PC_ECON_R', t: 'Large private fortunes should be limited when they distort public life.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-pc-r2', sec: 'Politics', fn: 'PC_ECON_L', t: 'Most goods are allocated well enough when buyers and sellers bargain freely.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-pc-r3', sec: 'Politics', fn: 'PC_AUTH', t: 'People should be free to ignore official guidance when it conflicts with their plans.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true },
    { id: 'qk-pc-r4', sec: 'Politics', fn: 'PC_LIB', t: 'Shared rules that restrict some personal choices can still be worthwhile.', lo: 'Disagree', hi: 'Agree', type: 's', rev: true }
  ];
  if (!g.AnimusQuestions) g.AnimusQuestions = { Q: [] };
  g.AnimusQuestions.Q = (g.AnimusQuestions.Q || []).concat(extra);
})(typeof window !== 'undefined' ? window : globalThis);
