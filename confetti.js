(function () {
  'use strict';

  var COLORS = ['#e0384c', '#f2b01e', '#35a862', '#2f73dc', '#ffffff', '#ff7ab6', '#7be0ff'];
  var canvas, ctx, W = 0, H = 0, dpr = 1;
  var parts = [];
  var raf = null;
  var last = 0;
  var timers = [];
  var pending = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function setup() {
    canvas = document.getElementById('confetti');
    if (!canvas) return false;
    ctx = canvas.getContext('2d');
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function shoot(x, y, angle, spread, count, power) {
    for (var i = 0; i < count; i++) {
      var a = (angle + rand(-spread / 2, spread / 2)) * Math.PI / 180;
      var v = power * rand(0.4, 1);
      var r = Math.random();
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: rand(7, 12), h: rand(4, 8),
        rot: rand(0, 6.28), vr: rand(-0.25, 0.25),
        tilt: rand(0, 6.28), vt: rand(0.1, 0.3),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        shape: r < 0.2 ? 'circle' : (r < 0.45 ? 'strip' : 'rect'),
        drag: rand(0.968, 0.982),
        life: 0, max: rand(3.2, 5)
      });
    }
  }

  function at(ms, fn) {
    pending += 1;
    timers.push(setTimeout(function () { pending -= 1; fn(); kick(); }, ms));
  }

  function kick() {
    if (raf == null && (parts.length || pending)) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  function loop(ts) {
    var dt = Math.min(2.5, (ts - last) / 16.667 || 1);
    last = ts;
    ctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life += dt / 60;
      var d = Math.pow(p.drag, dt);
      p.vx *= d;
      p.vy = p.vy * d + 0.3 * dt;
      p.x += p.vx * dt + Math.sin(p.tilt) * 0.5 * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.tilt += p.vt * dt;
      if (p.y > H + 40 || p.life > p.max) { parts.splice(i, 1); continue; }
      var alpha = Math.min(1, (p.max - p.life) / 0.8);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.tilt));
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.h * 0.6, 0, 6.2832);
        ctx.fill();
      } else if (p.shape === 'strip') {
        ctx.fillRect(-p.w * 1.1, -1.5, p.w * 2.2, 3);
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    if (parts.length || pending) raf = requestAnimationFrame(loop);
    else { raf = null; ctx.clearRect(0, 0, W, H); }
  }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    pending = 0;
    parts = [];
    if (raf != null) { cancelAnimationFrame(raf); raf = null; }
    if (ctx) ctx.clearRect(0, 0, W, H);
  }

  function celebrate(strength) {
    stop();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!setup()) return;
    var s = strength || 1;
    var power = Math.max(13, H * 0.047);
    var yb = H + 8;

    function cannons(n, pw) {
      shoot(W * 0.04, yb, -62, 34, Math.round(n * s), pw);
      shoot(W * 0.96, yb, -118, 34, Math.round(n * s), pw);
    }
    cannons(75, power);
    at(350, function () { shoot(W * 0.5, yb, -90, 60, Math.round(95 * s), power * 1.08); });
    at(950, function () { cannons(60, power * 0.95); });
    at(1700, function () {
      cannons(45, power * 0.9);
      shoot(W * 0.5, yb, -90, 50, Math.round(50 * s), power);
    });

    for (var k = 0; k < 9; k++) {
      at(600 + k * 260, function () {
        for (var i = 0; i < Math.round(7 * s); i++) {
          shoot(rand(0, W), -12, 90, 40, 1, rand(1.5, 3.5));
        }
      });
    }
    kick();
  }

  window.addEventListener('resize', function () { if (raf != null && setup()) {} });

  window.Confetti = { celebrate: celebrate, stop: stop };
})();
