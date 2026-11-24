(function () {
  'use strict';

  var KEY_USERS = 'kartukilat_users';
  var KEY_SESSION = 'kartukilat_session';
  var mem = {};
  var persistent = true;

  function lsGet(k) {
    try { return window.localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; }
  }
  function lsSet(k, v) {
    try { window.localStorage.setItem(k, v); return true; } catch (e) { mem[k] = v; return false; }
  }
  function lsDel(k) {
    try { window.localStorage.removeItem(k); } catch (e) { delete mem[k]; }
  }
  (function probe() {
    try {
      window.localStorage.setItem('kartukilat_probe', '1');
      window.localStorage.removeItem('kartukilat_probe');
    } catch (e) { persistent = false; }
  })();

  (function migrate() {
    ['users', 'session'].forEach(function (n) {
      var old = lsGet('uno2d_' + n);
      if (old === null) return;
      if (lsGet('kartukilat_' + n) === null) lsSet('kartukilat_' + n, old);
      lsDel('uno2d_' + n);
    });
  })();

  function readUsers() {
    try {
      var o = JSON.parse(lsGet(KEY_USERS) || '{}');
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch (e) { return {}; }
  }
  function writeUsers(u) { lsSet(KEY_USERS, JSON.stringify(u)); }

  function toHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function fallbackHash(s) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  function hash(salt, pw, scheme) {
    var s = salt + ':' + pw;
    var canSubtle = window.crypto && window.crypto.subtle && window.TextEncoder;
    if (scheme === 'f' || !canSubtle) return Promise.resolve('f:' + fallbackHash(s));
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
      .then(function (b) { return 's:' + toHex(b); })
      .catch(function () { return 'f:' + fallbackHash(s); });
  }
  function newSalt() {
    try {
      var a = new Uint8Array(8);
      window.crypto.getRandomValues(a);
      return toHex(a.buffer);
    } catch (e) {
      return String(Math.random()).slice(2) + String(Date.now());
    }
  }

  var RE_USER = /^[A-Za-z0-9_]{3,12}$/;
  var RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validateRegister(v) {
    if (!v.username) return { field: 'regUser', error: 'Username wajib diisi.' };
    if (!RE_USER.test(v.username)) return { field: 'regUser', error: 'Username 3 sampai 12 karakter: huruf, angka, atau garis bawah.' };
    if (!v.email) return { field: 'regEmail', error: 'Email wajib diisi.' };
    if (!RE_MAIL.test(v.email)) return { field: 'regEmail', error: 'Format email belum benar, contoh: nama@email.com.' };
    if (!v.password) return { field: 'regPass', error: 'Password wajib diisi.' };
    if (v.password.length < 6) return { field: 'regPass', error: 'Password minimal 6 karakter.' };
    if (v.password !== v.confirm) return { field: 'regPass2', error: 'Konfirmasi password tidak sama.' };
    return null;
  }

  function emptyStats() { return { rounds: 0, wins: 0, points: 0, best: 0 }; }

  function register(v) {
    var bad = validateRegister(v);
    if (bad) return Promise.resolve({ ok: false, field: bad.field, error: bad.error });
    var users = readUsers();
    var key = v.username.toLowerCase();
    if (users[key]) return Promise.resolve({ ok: false, field: 'regUser', error: 'Username sudah dipakai akun lain.' });
    var mail = v.email.toLowerCase();
    for (var k in users) {
      if (users[k].email === mail) return Promise.resolve({ ok: false, field: 'regEmail', error: 'Email sudah terdaftar.' });
    }
    var salt = newSalt();
    return hash(salt, v.password).then(function (h) {
      var fresh = readUsers();
      if (fresh[key]) return { ok: false, field: 'regUser', error: 'Username sudah dipakai akun lain.' };
      fresh[key] = { username: v.username, email: mail, salt: salt, hash: h, created: Date.now(), lastLogin: null, stats: emptyStats() };
      writeUsers(fresh);
      return { ok: true };
    });
  }

  function login(id, pw) {
    id = (id || '').trim().toLowerCase();
    if (!id || !pw) return Promise.resolve({ ok: false, error: 'Isi username atau email dan password.' });
    var users = readUsers();
    var found = users[id] || null;
    if (!found) {
      for (var k in users) { if (users[k].email === id) { found = users[k]; break; } }
    }
    var fail = { ok: false, error: 'Username, email, atau password salah.' };
    if (!found) return Promise.resolve(fail);
    var scheme = String(found.hash).charAt(0);
    return hash(found.salt, pw, scheme).then(function (h) {
      if (h !== found.hash) return fail;
      var all = readUsers();
      var rec = all[found.username.toLowerCase()];
      if (!rec) return fail;
      rec.lastLogin = Date.now();
      writeUsers(all);
      lsSet(KEY_SESSION, JSON.stringify({ username: rec.username, at: Date.now() }));
      return { ok: true, user: rec };
    });
  }

  function current() {
    var s;
    try { s = JSON.parse(lsGet(KEY_SESSION) || 'null'); } catch (e) { s = null; }
    if (!s || !s.username) return null;
    var u = readUsers()[String(s.username).toLowerCase()];
    if (!u) { lsDel(KEY_SESSION); return null; }
    if (!u.stats) u.stats = emptyStats();
    return u;
  }

  function logout() { lsDel(KEY_SESSION); }

  function recordRound(won, gained, matchPoints) {
    var s;
    try { s = JSON.parse(lsGet(KEY_SESSION) || 'null'); } catch (e) { s = null; }
    if (!s) return;
    var users = readUsers();
    var u = users[String(s.username).toLowerCase()];
    if (!u) return;
    var st = u.stats || emptyStats();
    st.rounds += 1;
    if (won) st.wins += 1;
    st.points += gained || 0;
    st.best = Math.max(st.best || 0, matchPoints || 0);
    u.stats = st;
    writeUsers(users);
  }

  var KEY_GAME = 'kartukilat_game';
  function saveGame(snapshot) {
    var u = current();
    if (!u) return;
    snapshot.owner = u.username.toLowerCase();
    lsSet(KEY_GAME, JSON.stringify(snapshot));
  }
  function loadGame() {
    var u = current();
    if (!u) return null;
    var s;
    try { s = JSON.parse(lsGet(KEY_GAME) || 'null'); } catch (e) { s = null; }
    if (!s || s.owner !== u.username.toLowerCase() || !s.game) return null;
    return s;
  }
  function clearGame() { lsDel(KEY_GAME); }

  function requireLogin() {
    var u = current();
    if (!u) { window.location.replace('index.html'); return null; }
    return u;
  }

  function redirectIfLoggedIn() {
    if (current()) { window.location.replace('dashboard.html'); return true; }
    return false;
  }

  window.Auth = {
    current: current, logout: logout, recordRound: recordRound,
    register: register, login: login,
    saveGame: saveGame, loadGame: loadGame, clearGame: clearGame,
    requireLogin: requireLogin, redirectIfLoggedIn: redirectIfLoggedIn,
    isPersistent: function () { return persistent; }
  };
})();
