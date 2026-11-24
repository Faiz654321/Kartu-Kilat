(function () {
  'use strict';
  if (window.Auth.redirectIfLoggedIn()) return;
  window.UI.warnStorage();
  var q = window.UI.takeParams();
  if (q.get('keluar')) window.UI.setMsg('homeNote', 'Kamu sudah keluar. Akun dan skormu tetap tersimpan.', 'ok');
})();
