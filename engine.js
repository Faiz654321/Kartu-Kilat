(function (root) {
  'use strict';

  var COLORS = ['red', 'yellow', 'green', 'blue'];
  var NUMERIC = /^[0-9]$/;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function Game() {
    this.uid = 0;
    this.points = [0, 0];
    this.newRound(0);
  }

  Game.prototype.mk = function (color, value) {
    this.uid += 1;
    return { id: this.uid, color: color, value: value };
  };

  Game.prototype.buildDeck = function () {
    var d = [];
    var self = this;
    COLORS.forEach(function (c) {
      d.push(self.mk(c, '0'));
      for (var n = 1; n <= 9; n++) {
        d.push(self.mk(c, String(n)));
        d.push(self.mk(c, String(n)));
      }
      ['skip', 'reverse', 'draw2'].forEach(function (v) {
        d.push(self.mk(c, v));
        d.push(self.mk(c, v));
      });
    });
    for (var i = 0; i < 4; i++) {
      d.push(self.mk('wild', 'wild'));
      d.push(self.mk('wild', 'wild4'));
    }
    return d;
  };

  Game.prototype.newRound = function (starter) {
    this.deck = shuffle(this.buildDeck());
    this.discard = [];
    this.hands = [[], []];
    for (var r = 0; r < 7; r++) {
      for (var p = 0; p < 2; p++) this.hands[p].push(this.deck.pop());
    }
    var first = null;
    var skipped = [];
    while (!first) {
      var c = this.deck.pop();
      if (NUMERIC.test(c.value)) first = c; else skipped.push(c);
    }
    this.deck = shuffle(this.deck.concat(skipped));
    this.discard.push(first);
    this.curColor = first.color;
    this.turn = starter;
    this.over = false;
    this.winner = null;
  };

  Game.prototype.top = function () { return this.discard[this.discard.length - 1]; };

  Game.prototype.canPlay = function (c) {
    return c.color === 'wild' || c.color === this.curColor || c.value === this.top().value;
  };

  Game.prototype.playable = function (p) {
    var self = this;
    return this.hands[p].filter(function (c) { return self.canPlay(c); });
  };

  Game.prototype.draw = function (p, n) {
    var got = [];
    for (var i = 0; i < n; i++) {
      if (!this.deck.length) {
        if (this.discard.length <= 1) break;
        var t = this.discard.pop();
        this.deck = shuffle(this.discard);
        this.discard = [t];
      }
      var c = this.deck.pop();
      if (!c) break;
      this.hands[p].push(c);
      got.push(c);
    }
    return got;
  };

  Game.prototype.cardPoints = function (c) {
    if (NUMERIC.test(c.value)) return parseInt(c.value, 10);
    if (c.color === 'wild') return 50;
    return 20;
  };

  Game.prototype.handPoints = function (p) {
    var self = this;
    return this.hands[p].reduce(function (s, c) { return s + self.cardPoints(c); }, 0);
  };

  Game.prototype.play = function (p, card, color, saidUno) {
    var h = this.hands[p];
    var i = h.indexOf(card);
    if (i < 0) throw new Error('Kartu tidak ada di tangan pemain');
    if (card.color === 'wild' && COLORS.indexOf(color) < 0) throw new Error('Warna belum dipilih');
    h.splice(i, 1);
    this.discard.push(card);
    this.curColor = card.color === 'wild' ? color : card.color;

    var opp = 1 - p;
    var res = { card: card, color: this.curColor, effect: null, drawn: 0, penalty: 0, uno: false, won: false, gained: 0, again: false };

    if (card.value === 'skip' || card.value === 'reverse') {
      res.effect = card.value;
      res.again = true;
    } else if (card.value === 'draw2') {
      res.effect = 'draw2';
      res.drawn = this.draw(opp, 2).length;
      res.again = true;
    } else if (card.value === 'wild4') {
      res.effect = 'wild4';
      res.drawn = this.draw(opp, 4).length;
      res.again = true;
    }

    if (h.length === 0) {
      this.over = true;
      this.winner = p;
      res.won = true;
      res.gained = this.handPoints(opp);
      this.points[p] += res.gained;
      return res;
    }

    if (h.length === 1) {
      res.uno = true;
      if (!saidUno) res.penalty = this.draw(p, 2).length;
    }

    this.turn = res.again ? p : opp;
    return res;
  };

  Game.prototype.botColor = function (p) {
    var cnt = { red: 0, yellow: 0, green: 0, blue: 0 };
    this.hands[p].forEach(function (c) { if (c.color !== 'wild') cnt[c.color] += 1; });
    return COLORS.slice().sort(function (a, b) {
      return cnt[b] - cnt[a] + (Math.random() - 0.5) * 0.4;
    })[0];
  };

  Game.prototype.botMove = function (p) {
    var pl = this.playable(p);
    if (!pl.length) return null;
    var threat = this.hands[1 - p].length <= 2;
    var scored = pl.map(function (c) {
      var s;
      if (c.color === 'wild') s = (threat && c.value === 'wild4') ? 2.5 : 0;
      else if (c.value === 'skip' || c.value === 'reverse' || c.value === 'draw2') s = threat ? 3 : 1.5;
      else s = 1;
      return { c: c, s: s + Math.random() * 0.8 };
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    var card = scored[0].c;
    return { card: card, color: card.color === 'wild' ? this.botColor(p) : null };
  };

  Game.prototype.total = function () {
    return this.deck.length + this.discard.length + this.hands[0].length + this.hands[1].length;
  };

  var api = { Game: Game, COLORS: COLORS };
  root.UnoEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
