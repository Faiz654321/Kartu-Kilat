(function () {
  'use strict';

  var E = window.UnoEngine;
  var CNAME = { red: 'Merah', yellow: 'Kuning', green: 'Hijau', blue: 'Biru' };

  var G = null;
  var mode = 'bot';
  var names = ['Pemain 1', 'Komputer'];
  var viewer = null;
  var busy = true;
  var drawnId = null;
  var unoArmed = false;
  var pendingWild = null;
  var timer = null;
  var toastTimer = null;
  var lastTopId = null;
  var rots = {};
  var starter = 0;

  function $(id) { return document.getElementById(id); }
  function isBot(p) { return mode === 'bot' && p === 1; }

  function valueText(v) {
    if (v === 'skip') return 'Lewati';
    if (v === 'reverse') return 'Balik';
    if (v === 'draw2') return '+2';
    if (v === 'wild') return 'Wild';
    if (v === 'wild4') return 'Wild +4';
    return v;
  }
  function label(c) { return c.color === 'wild' ? valueText(c.value) : CNAME[c.color] + ' ' + valueText(c.value); }

  var CARD_DIR = 'assets/cards/png/';
  var COLOR_FILE = { red: 'merah', yellow: 'kuning', green: 'hijau', blue: 'biru' };
  var VALUE_FILE = { skip: 'lewati', reverse: 'balik', draw2: 'tambah2' };

  function cardSrc(c, tint) {
    if (c.color === 'wild') {
      var base = c.value === 'wild4' ? 'wild-tambah4' : 'wild';
      return CARD_DIR + base + (tint ? '-' + COLOR_FILE[tint] : '') + '.png';
    }
    return CARD_DIR + COLOR_FILE[c.color] + '-' + (VALUE_FILE[c.value] || c.value) + '.png';
  }
  function imgEl(src) {
    var im = document.createElement('img');
    im.src = src;
    im.alt = '';
    im.draggable = false;
    return im;
  }
  function cardEl(c, extra, tint) {
    var el = document.createElement('div');
    el.className = 'card ' + c.color + (extra ? ' ' + extra : '');
    el.setAttribute('aria-label', label(c));
    el.appendChild(imgEl(cardSrc(c, tint)));
    return el;
  }
  function backEl(extra) {
    var el = document.createElement('div');
    el.className = 'card back' + (extra ? ' ' + extra : '');
    el.appendChild(imgEl(CARD_DIR + 'punggung.png'));
    return el;
  }

  function preload() {
    var files = ['punggung'];
    ['merah', 'kuning', 'hijau', 'biru'].forEach(function (col) {
      for (var n = 0; n <= 9; n++) files.push(col + '-' + n);
      files.push(col + '-lewati', col + '-balik', col + '-tambah2', 'wild-' + col, 'wild-tambah4-' + col);
    });
    files.push('wild', 'wild-tambah4');
    files.forEach(function (f) { new Image().src = CARD_DIR + f + '.png'; });
  }

  function avatarSvg(p) {
    if (isBot(p)) {
      return '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="#5b7fd6"/><rect x="9" y="13" width="22" height="18" rx="4" fill="#e9eef9"/><circle cx="15.5" cy="22" r="3" fill="#1e2a4a"/><circle cx="24.5" cy="22" r="3" fill="#1e2a4a"/><rect x="18" y="7" width="4" height="6" fill="#e9eef9"/><circle cx="20" cy="6.5" r="2.5" fill="#f2b01e"/></svg>';
    }
    var bg = p === 0 ? '#e8793a' : '#3aa88f';
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="' + bg + '"/><circle cx="20" cy="16" r="7" fill="#f6e8d6"/><path d="M6 40c0-9 6-13 14-13s14 4 14 13z" fill="#f6e8d6"/></svg>';
  }

  function fanBottom(box, inner, els) {
    var n = els.length;
    if (!n) return;
    var W = box.clientWidth;
    var cw = els[0].offsetWidth || 60;
    var step = n > 1 ? Math.min(cw * 0.66, (W - cw - 24) / (n - 1)) : 0;
    step = Math.max(step, cw * 0.34);
    var total = cw + (n - 1) * step;
    var innerW = Math.max(W, total + 24);
    inner.style.width = innerW + 'px';
    var start = (innerW - total) / 2;
    var m = (n - 1) / 2;
    var ang = Math.min(4.5, 20 / Math.max(m, 1));
    els.forEach(function (el, i) {
      var off = i - m;
      el.style.left = (start + i * step) + 'px';
      el.style.setProperty('--r', (off * ang) + 'deg');
      el.style.setProperty('--y', (off * off * cw * 0.012) + 'px');
      el.style.zIndex = i;
    });
    box.scrollLeft = Math.max(0, (innerW - W) / 2);
  }

  function fanTop(inner, els) {
    var n = els.length;
    if (!n) return;
    var W = inner.clientWidth;
    var cw = els[0].offsetWidth || 60;
    var step = n > 1 ? Math.min(cw * 0.66, (W - cw - 24) / (n - 1)) : 0;
    step = Math.max(step, cw * 0.1);
    var total = cw + (n - 1) * step;
    var start = (W - total) / 2;
    var m = (n - 1) / 2;
    var ang = Math.min(4.5, 20 / Math.max(m, 1));
    els.forEach(function (el, i) {
      var off = i - m;
      el.style.left = (start + i * step) + 'px';
      el.style.setProperty('--r', (-off * ang) + 'deg');
      el.style.setProperty('--y', (-off * off * cw * 0.008) + 'px');
      el.style.zIndex = i;
    });
  }

  function sortedHand(p) {
    return G.hands[p].slice().sort(function (a, b) {
      var ia = a.color === 'wild' ? 9 : E.COLORS.indexOf(a.color);
      var ib = b.color === 'wild' ? 9 : E.COLORS.indexOf(b.color);
      if (ia !== ib) return ia - ib;
      var va = parseInt(a.value, 10), vb = parseInt(b.value, 10);
      if (isNaN(va)) va = 20 + a.value.length;
      if (isNaN(vb)) vb = 20 + b.value.length;
      return va - vb;
    });
  }

  function setChip(el, p) {
    el.querySelector('.nm').textContent = names[p].toUpperCase();
    el.querySelector('.pts').textContent = G.points[p] + ' POIN';
    el.querySelector('.cnt').textContent = G.hands[p].length;
    el.querySelector('.face').innerHTML = avatarSvg(p);
    el.classList.toggle('active', G.turn === p && !G.over);
  }

  function render() {
    if (!G) return;
    var v = viewer == null ? 0 : viewer;
    var o = 1 - v;
    var myTurn = !busy && !G.over && G.turn === v && !isBot(G.turn);

    setChip($('chipBottom'), v);
    setChip($('chipTop'), o);

    var topInner = $('topInner');
    topInner.innerHTML = '';
    var backs = [];
    for (var i = 0; i < G.hands[o].length; i++) {
      var b = backEl();
      topInner.appendChild(b);
      backs.push(b);
    }
    fanTop(topInner, backs);

    var dp = $('drawPile');
    dp.innerHTML = '';
    dp.appendChild(backEl('dark'));
    var badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = G.deck.length;
    dp.appendChild(badge);
    var canDraw = myTurn && !drawnId;
    dp.disabled = !canDraw;
    dp.classList.toggle('hint', canDraw && G.playable(v).length === 0);

    var st = $('discardPile');
    st.innerHTML = '';
    var from = Math.max(0, G.discard.length - 4);
    for (var k = from; k < G.discard.length; k++) {
      var c = G.discard[k];
      if (rots[c.id] === undefined) rots[c.id] = Math.round((Math.random() - 0.5) * 34);
      var el = cardEl(c, '', k === G.discard.length - 1 && c.color === 'wild' ? G.curColor : null);
      el.style.setProperty('--rot', rots[c.id] + 'deg');
      if (k === G.discard.length - 1 && c.id !== lastTopId) el.classList.add('pop');
      st.appendChild(el);
    }
    lastTopId = G.top().id;
    $('stackWrap').className = 'stack-wrap c-' + G.curColor;
    $('colName').textContent = 'Warna: ' + CNAME[G.curColor];

    var hint = '';
    if (!G.over) {
      if (isBot(G.turn)) hint = 'Giliran ' + names[G.turn] + '...';
      else if (busy) hint = '';
      else if (drawnId) hint = 'Mainkan kartu yang baru diambil atau lewati giliran.';
      else if (G.playable(v).length) hint = (mode === 'duo' ? names[v] + ', ' : '') + 'pilih kartu yang terangkat.';
      else hint = 'Tidak ada yang cocok. Ketuk tumpukan untuk mengambil kartu.';
    }
    $('hint').textContent = hint;

    $('unoBtn').disabled = !(myTurn && G.hands[v].length === 2);
    $('unoBtn').classList.toggle('on', unoArmed);
    $('unoBtn').textContent = unoArmed ? 'Kilat! siap' : 'Bilang Kilat!';
    $('passBtn').disabled = !(myTurn && drawnId);

    var inner = $('handInner');
    var box = $('handBox');
    inner.innerHTML = '';
    var els = [];
    sortedHand(v).forEach(function (c) {
      var playable = myTurn && G.canPlay(c) && (!drawnId || c.id === drawnId);
      var e = cardEl(c, playable ? 'ok' : (myTurn ? 'no' : ''));
      e.setAttribute('role', 'button');
      e.tabIndex = playable ? 0 : -1;
      e.addEventListener('click', function () { humanPlay(c, e); });
      e.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); humanPlay(c, e); }
      });
      inner.appendChild(e);
      els.push(e);
    });
    fanBottom(box, inner, els);
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  function describe(p, res) {
    var s = names[p] + ' main ' + label(res.card);
    if (res.card.color === 'wild') s += ' (' + CNAME[res.color] + ')';
    var o = names[1 - p];
    if (res.effect === 'skip' || res.effect === 'reverse') s += '. ' + o + ' dilewati';
    else if (res.effect === 'draw2') s += '. ' + o + ' ambil 2 kartu dan dilewati';
    else if (res.effect === 'wild4') s += '. ' + o + ' ambil 4 kartu dan dilewati';
    if (res.penalty) s += '. Lupa bilang Kilat, ambil 2 kartu';
    else if (res.uno) s += '. Kilat!';
    return s;
  }

  function later(fn, ms) {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  }

  function beginTurn() {
    clearTimeout(timer);
    if (!G || G.over) return;
    saveSnapshot();
    var p = G.turn;
    drawnId = null;
    unoArmed = false;
    if (isBot(p)) {
      viewer = 0;
      busy = true;
      render();
      later(botTurn, 1000);
    } else if (mode === 'duo' && viewer !== p) {
      viewer = p;
      busy = true;
      render();
      showHandoff(p);
    } else {
      viewer = mode === 'bot' ? 0 : p;
      busy = false;
      render();
    }
  }

  function showHandoff(p) {
    $('hoTitle').textContent = 'Giliran ' + names[p];
    $('hoText').textContent = 'Serahkan perangkat ke ' + names[p] + ', lalu ketuk tombol di bawah. Jangan intip kartu lawan.';
    $('handoff').hidden = false;
    $('hoBtn').focus();
  }

  function doPlay(card, color) {
    var p = G.turn;
    var said = unoArmed || isBot(p);
    var res = G.play(p, card, color, said);
    unoArmed = false;
    drawnId = null;
    toast(describe(p, res));
    busy = true;
    render();
    if (res.won) { later(function () { endRound(p, res); }, 800); return; }
    later(beginTurn, 650);
  }

  function buildWinFan() {
    var fan = $('winFan');
    fan.innerHTML = '';
    var vals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    var cols = E.COLORS.slice().sort(function () { return Math.random() - 0.5; });
    var n = 7;
    for (var i = 0; i < n; i++) {
      var center = i === (n - 1) / 2;
      var c = center
        ? { color: 'wild', value: 'wild4' }
        : { color: cols[i % 4], value: vals[Math.floor(Math.random() * vals.length)] };
      var el = cardEl(c);
      el.style.setProperty('--a', ((i - (n - 1) / 2) * 11) + 'deg');
      el.style.setProperty('--i', Math.abs(i - (n - 1) / 2));
      fan.appendChild(el);
    }
  }

  function buildScores(winner) {
    var box = $('winScore');
    box.innerHTML = '';
    [0, 1].forEach(function (i) {
      var pill = document.createElement('div');
      pill.className = 'spill' + (i === winner ? ' top' : '');
      var nm = document.createElement('span');
      nm.textContent = names[i];
      var pts = document.createElement('b');
      pts.textContent = G.points[i];
      pill.appendChild(nm);
      pill.appendChild(pts);
      box.appendChild(pill);
    });
  }

  function endRound(p, res) {
    render();

    if (window.Auth) window.Auth.recordRound(p === 0, p === 0 ? res.gained : 0, G.points[0]);
    if (window.Auth) window.Auth.clearGame();
    var botWon = isBot(p);
    $('winLabel').textContent = botWon ? '\u2605 KOMPUTER MENANG \u2605' : '\u2605 PEMENANG \u2605';
    $('winTitle').textContent = names[p];
    $('winSub').textContent = '+' + res.gained + ' poin dari sisa kartu ' + names[1 - p] + (botWon ? '. Coba lagi!' : '.');
    buildWinFan();
    buildScores(p);
    $('winOv').classList.toggle('lose', botWon);
    $('winOv').hidden = false;
    if (window.Confetti) window.Confetti.celebrate(botWon ? 0.45 : 1);
    $('againBtn').focus();
  }

  function humanPlay(card, el) {
    if (!G || busy || G.over || isBot(G.turn)) return;
    if (!G.canPlay(card) || (drawnId && card.id !== drawnId)) {
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      return;
    }
    if (card.color === 'wild') {
      pendingWild = card;
      $('colorOv').hidden = false;
      var first = document.querySelector('#colorOv .sw');
      if (first) first.focus();
      return;
    }
    doPlay(card, null);
  }

  function humanDraw() {
    if (!G || busy || G.over || isBot(G.turn) || drawnId) return;
    var p = G.turn;
    var got = G.draw(p, 1);
    var c = got[0];
    if (!c) {
      toast('Tumpukan habis. Giliran dilewati.');
      busy = true;
      render();
      later(function () { G.turn = 1 - p; beginTurn(); }, 800);
      return;
    }
    if (G.canPlay(c)) {
      drawnId = c.id;
      toast(names[p] + ' ambil ' + label(c) + '. Mainkan atau lewati.');
      render();
    } else {
      busy = true;
      toast(names[p] + ' ambil ' + label(c) + ', tidak cocok.');
      render();
      later(function () { G.turn = 1 - p; beginTurn(); }, 1000);
    }
  }

  function humanPass() {
    if (!G || busy || G.over || !drawnId) return;
    var p = G.turn;
    busy = true;
    toast(names[p] + ' melewati giliran');
    render();
    later(function () { G.turn = 1 - p; beginTurn(); }, 500);
  }

  function botTurn() {
    if (!G || G.over) return;
    var p = G.turn;
    var mv = G.botMove(p);
    if (mv) { doPlay(mv.card, mv.color); return; }
    var got = G.draw(p, 1);
    var c = got[0];
    if (c && G.canPlay(c)) {
      toast(names[p] + ' ambil kartu dan memainkannya');
      render();
      later(function () { doPlay(c, c.color === 'wild' ? G.botColor(p) : null); }, 800);
    } else {
      toast(names[p] + ' ambil 1 kartu dan lewat');
      render();
      later(function () { G.turn = 1 - p; beginTurn(); }, 900);
    }
  }

  function startMatch(m, p2) {
    var user = window.Auth && window.Auth.current();
    if (!user) { window.location.replace('index.html'); return; }
    mode = m === 'duo' ? 'duo' : 'bot';
    var n1 = user.username;
    var n2 = (p2 || '').trim().slice(0, 10) || 'Pemain 2';
    names = mode === 'bot' ? [n1, 'Komputer'] : [n1, n2];
    G = new E.Game();
    starter = Math.floor(Math.random() * 2);
    G.newRound(starter);
    rots = {};
    lastTopId = null;
    viewer = mode === 'bot' ? 0 : null;
    closeOverlays();
    toast('Kartu pertama: ' + label(G.top()) + '. ' + names[G.turn] + ' jalan duluan.');
    beginTurn();
  }

  function saveSnapshot() {
    if (!G || G.over || !window.Auth) return;
    window.Auth.saveGame({
      mode: mode, names: names, starter: starter,
      game: { uid: G.uid, points: G.points, deck: G.deck, discard: G.discard, hands: G.hands, curColor: G.curColor, turn: G.turn }
    });
  }
  function resumeSaved() {
    var s = window.Auth && window.Auth.loadGame();
    if (!s) return false;
    mode = s.mode === 'duo' ? 'duo' : 'bot';
    names = s.names;
    starter = s.starter || 0;
    G = new E.Game();
    var d = s.game;
    G.uid = d.uid; G.points = d.points; G.deck = d.deck; G.discard = d.discard;
    G.hands = d.hands; G.curColor = d.curColor; G.turn = d.turn; G.over = false; G.winner = null;
    rots = {};
    lastTopId = null;
    viewer = mode === 'bot' ? 0 : null;
    closeOverlays();
    toast('Permainan dilanjutkan. Giliran ' + names[G.turn] + '.');
    beginTurn();
    return true;
  }

  function nextRound() {
    starter = 1 - starter;
    G.newRound(starter);
    rots = {};
    lastTopId = null;
    viewer = mode === 'bot' ? 0 : null;
    closeOverlays();
    toast('Ronde baru. ' + names[G.turn] + ' jalan duluan.');
    beginTurn();
  }

  function closeOverlays() {
    ['colorOv', 'winOv', 'handoff'].forEach(function (id) { $(id).hidden = true; });
    if (window.Confetti) window.Confetti.stop();
  }

  function openMenu() { window.location.href = 'dashboard.html'; }

  document.querySelectorAll('#colorOv .sw').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = pendingWild;
      pendingWild = null;
      $('colorOv').hidden = true;
      if (card && G && !G.over) doPlay(card, b.getAttribute('data-color'));
    });
  });
  $('menuBtn').addEventListener('click', openMenu);
  $('winMenuBtn').addEventListener('click', function () { $('winOv').hidden = true; if (window.Confetti) window.Confetti.stop(); openMenu(); });
  $('againBtn').addEventListener('click', nextRound);
  $('drawPile').addEventListener('click', humanDraw);
  $('passBtn').addEventListener('click', humanPass);
  $('unoBtn').addEventListener('click', function () {
    if (!G || busy) return;
    var v = viewer == null ? 0 : viewer;
    if (G.turn === v && G.hands[v].length === 2) { unoArmed = !unoArmed; render(); }
  });
  $('hoBtn').addEventListener('click', function () {
    $('handoff').hidden = true;
    busy = false;
    render();
  });

  (function init() {
    preload();
    var user = window.Auth && window.Auth.requireLogin();
    if (!user) return;
    var q = new URLSearchParams(window.location.search);
    if (q.has('mode')) {
      try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
      startMatch(q.get('mode'), q.get('p2'));
    } else if (!resumeSaved()) {
      window.location.replace('dashboard.html');
    }
  })();

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 120);
  });
})();
