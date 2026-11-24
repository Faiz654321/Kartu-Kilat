(function () {
  'use strict';
  var U = window.UI, $ = U.$;
  if (window.Auth.redirectIfLoggedIn()) return;
  U.warnStorage();
  U.wireEyes();

  var q = U.takeParams();
  var akun = q.get('akun');
  if (akun) $('logId').value = akun;
  if (q.get('baru')) U.setMsg('logMsg', 'Akun berhasil dibuat. Silakan login.', 'ok');
  (akun ? $('logPass') : $('logId')).focus();

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.currentTarget;
    U.clearBad(form);
    var btn = $('logSubmit');
    btn.disabled = true;
    window.Auth.login($('logId').value, $('logPass').value).then(function (res) {
      btn.disabled = false;
      if (!res.ok) {
        U.setMsg('logMsg', res.error, 'err');
        $('logId').parentNode.classList.add('bad');
        $('logPass').parentNode.classList.add('bad');
        $('logPass').value = '';
        $('logPass').focus();
        return;
      }
      U.setMsg('logMsg', 'Login berhasil. Selamat datang, ' + res.user.username + '!', 'ok');
      setTimeout(function () { window.location.href = 'dashboard.html'; }, 650);
    });
  });
})();
