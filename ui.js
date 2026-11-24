(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }

  function setMsg(id, text, kind) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }
  function clearBad(form) {
    form.querySelectorAll('.field.bad').forEach(function (f) { f.classList.remove('bad'); });
    form.querySelectorAll('input').forEach(function (i) { i.removeAttribute('aria-invalid'); });
  }
  function markBad(id) {
    var inp = $(id);
    if (!inp) return;
    inp.setAttribute('aria-invalid', 'true');
    if (inp.parentNode) inp.parentNode.classList.add('bad');
    inp.focus();
  }

  function wireEyes() {
    document.querySelectorAll('.eye').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = $(b.getAttribute('data-for'));
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.classList.toggle('on', show);
        b.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
      });
    });
  }

  function warnStorage() {
    var w = $('storeWarn');
    if (w && window.Auth) w.hidden = window.Auth.isPersistent();
  }

  function takeParams() {
    var q = new URLSearchParams(window.location.search);
    try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
    return q;
  }

  window.UI = { $: $, setMsg: setMsg, clearBad: clearBad, markBad: markBad, wireEyes: wireEyes, warnStorage: warnStorage, takeParams: takeParams };
})();
