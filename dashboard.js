(function () {
  'use strict';
  var U = window.UI, $ = U.$;
  var user = window.Auth.requireLogin();
  if (!user) return;
  U.warnStorage();

  function fmt(n) { return Number(n || 0).toLocaleString('id-ID'); }

  $('dashName').textContent = user.username;
  $('dashEmail').textContent = user.email;
  $('stRounds').textContent = fmt(user.stats.rounds);
  $('stWins').textContent = fmt(user.stats.wins);
  $('stPoints').textContent = fmt(user.stats.points);
  $('stBest').textContent = fmt(user.stats.best);

  var canResume = !!window.Auth.loadGame();
  $('backBtn').hidden = !canResume;
  $('startLabel').textContent = canResume ? 'Mulai permainan baru' : 'Mulai main';

  document.querySelectorAll('.mode').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.mode').forEach(function (x) {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      $('name2Wrap').hidden = b.getAttribute('data-mode') !== 'duo';
    });
  });

  $('startBtn').addEventListener('click', function () {
    var m = document.querySelector('.mode.on').getAttribute('data-mode');
    var url = 'game.html?mode=' + m;
    if (m === 'duo') url += '&p2=' + encodeURIComponent($('name2').value.trim());
    window.location.href = url;
  });
  $('backBtn').addEventListener('click', function () { window.location.href = 'game.html'; });

  function openRules() { $('rulesOv').hidden = false; $('rulesClose').focus(); }
  function closeRules() { $('rulesOv').hidden = true; $('rulesBtn').focus(); }
  $('rulesBtn').addEventListener('click', openRules);
  $('rulesClose').addEventListener('click', closeRules);
  $('rulesOk').addEventListener('click', closeRules);
  $('rulesOv').addEventListener('click', function (e) { if (e.target === e.currentTarget) closeRules(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('rulesOv').hidden) closeRules();
  });

  $('logoutBtn').addEventListener('click', function () {
    window.Auth.logout();
    window.location.href = 'index.html?keluar=1';
  });

  (canResume ? $('backBtn') : $('startBtn')).focus();
})();
