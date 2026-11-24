(function () {
  'use strict';
  var U = window.UI, $ = U.$;
  if (window.Auth.redirectIfLoggedIn()) return;
  U.warnStorage();
  U.wireEyes();
  $('regUser').focus();

  $('regForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.currentTarget;
    U.clearBad(form);
    var v = { username: $('regUser').value.trim(), email: $('regEmail').value.trim(), password: $('regPass').value, confirm: $('regPass2').value };
    var btn = $('regSubmit');
    btn.disabled = true;
    window.Auth.register(v).then(function (res) {
      btn.disabled = false;
      if (!res.ok) { U.setMsg('regMsg', res.error, 'err'); U.markBad(res.field); return; }
      U.setMsg('regMsg', 'Registrasi berhasil. Mengarahkan ke halaman login...', 'ok');
      setTimeout(function () {
        window.location.href = 'login.html?baru=1&akun=' + encodeURIComponent(v.username);
      }, 800);
    });
  });
})();
