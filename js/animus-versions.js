/**
 * Bank / scoring / prompt versions. Changing these separates old results
 * from new ones — never silently re-score legacy snapshots.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnimusVersions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
    BANK_VERSION: '2026.08.16',
    SCORING_VERSION: '2026.08.16',
    PROMPT_VERSION: '2026.08.16-v1',
    LEGACY_BANK: 'legacy',
    LEGACY_SCORING: 'legacy'
  };
});
