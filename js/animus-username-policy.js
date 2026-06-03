/**
 * Username validation: reserved routes/system names + blocked terms (slurs, profanity, impersonation).
 */
(function (g) {
  'use strict';

  var RESERVED = [
    'admin', 'animus', 'animusofficial', 'official', 'moderator', 'mod', 'staff', 'support',
    'help', 'api', 'test', 'login', 'logout', 'signin', 'signup', 'register', 'dashboard',
    'settings', 'profile', 'compare', 'friends', 'friend', 'activity', 'notifications',
    'notification', 'group', 'groups', 'types', 'type', 'shop', 'store', 'billing',
    'landing', 'index', 'home', 'about', 'legal', 'terms', 'privacy', '404', 'null',
    'undefined', 'www', 'http', 'https', 'static', 'assets', 'public', 'vercel',
    'firebase', 'stripe', 'webhook', 'oauth', 'auth', 'account', 'accounts', 'user',
    'users', 'root', 'system', 'security', 'abuse', 'report', 'contact', 'mail',
    'email', 'password', 'passwd', 'psyche', 'assessment', 'results', 'result'
  ];

  var RESERVED_SET = {};
  RESERVED.forEach(function (r) {
    RESERVED_SET[r] = true;
  });

  /** Normalized substrings checked on leet-folded username (underscores removed). */
  var BANNED_SUBSTRINGS = [
    'fuck', 'fuk', 'fck', 'shit', 'sht', 'bitch', 'btch', 'cunt', 'dick', 'cock',
    'pussy', 'asshole', 'bastard', 'whore', 'slut', 'nigger', 'nigga', 'n1gga',
    'n1gger', 'chink', 'gook', 'kike', 'spic', 'wetback', 'beaner', 'raghead',
    'towelhead', 'faggot', 'fagot', 'fag', 'dyke', 'tranny', 'retard', 'retarded',
    'rape', 'rapist', 'molest', 'pedo', 'pedophile', 'paedophile', 'childporn',
    'cporn', 'loli', 'lolicon', 'hitler', 'nazi', 'heil', 'holocaust', 'isis',
    'terrorist', 'killall', 'kys', 'suicide', 'onlyfans', 'pornhub', 'xvideos',
    'xnxx', 'porn', 'xxx', 'hentai', 'nude', 'nudes', 'sendnudes', 'deepthroat',
    'blowjob', 'handjob', 'cumshot', 'milf', 'incest', 'bestiality', 'zoophile'
  ];

  function sanitize(raw) {
    return String(raw || '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 32);
  }

  function foldLeet(s) {
    return String(s || '')
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/7/g, 't')
      .replace(/8/g, 'b')
      .replace(/@/g, 'a')
      .replace(/\$/g, 's')
      .replace(/_/g, '');
  }

  function validate(raw) {
    var username = sanitize(raw);
    if (!username) {
      return { ok: false, code: 'empty', message: 'Enter a username.' };
    }
    if (username.length < 3) {
      return { ok: false, code: 'short', message: 'Username must be at least 3 characters.' };
    }
    if (RESERVED_SET[username]) {
      return {
        ok: false,
        code: 'reserved',
        message: '@' + username + ' is reserved. Choose another name.'
      };
    }
    var folded = foldLeet(username);
    for (var i = 0; i < BANNED_SUBSTRINGS.length; i++) {
      if (folded.indexOf(BANNED_SUBSTRINGS[i]) !== -1) {
        return {
          ok: false,
          code: 'banned',
          message: 'This username is not allowed. Choose a different name.'
        };
      }
    }
    return { ok: true, username: username };
  }

  function statusMessage(result) {
    if (!result) return '';
    return result.message || '';
  }

  g.AnimusUsernamePolicy = {
    RESERVED: RESERVED,
    RESERVED_SET: RESERVED_SET,
    sanitize: sanitize,
    foldLeet: foldLeet,
    validate: validate,
    statusMessage: statusMessage
  };
})(typeof window !== 'undefined' ? window : globalThis);
