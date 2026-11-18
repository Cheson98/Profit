/* Webversie (iPhone en andere browsers): geluid, scherm aan houden, bestanden bewaren en offline gebruik.
 * Op Android doet de Java-brug dit; deze code wordt daar niet gebruikt, behalve de kleine hulpjes. */
(function () {
  'use strict';

  var W = {};
  function noop() { /* */ }

  // ---------- apparaat ----------
  W.isIOS = function () {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };
  W.isStandalone = function () {
    try {
      return navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    } catch (e) { return false; }
  };
  W.canVibrate = function () { return typeof navigator.vibrate === 'function'; };
  // Werkt "scherm aan houden" echt? In een beginscherm-app op iOS werkt het pas vanaf 18.4 (eerder bestaat de functie wel, maar doet niets).
  W.canKeepAwake = function () {
    if (!navigator.wakeLock) return false;
    if (W.isIOS() && W.isStandalone()) {
      var m = /OS (\d+)_(\d+)/.exec(navigator.userAgent || '');
      if (!m) return false;
      return +m[1] > 18 || (+m[1] === 18 && +m[2] >= 4);
    }
    return true;
  };

  // ---------- geluid ----------
  var ctx = null, silent = null, usedSession = false;

  function silentWavUrl() {
    // 1 seconde stilte (8 kHz, 8 bit, mono): houdt op iOS het geluid "aan", ook als de stilteschakelaar uit staat
    var n = 8000, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    str(36, 'data'); v.setUint32(40, n, true);
    for (var i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  function context() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
  }

  // Aanroepen vanuit een tik van de gebruiker: iOS staat geluid pas daarna toe.
  W.unlock = function () {
    try {
      if (navigator.audioSession) { navigator.audioSession.type = 'playback'; usedSession = true; }
    } catch (e) { /* niet ondersteund */ }
    try {
      var c = context();
      if (!c) return;
      if (c.state !== 'running' && c.resume) c.resume().catch(noop);
      var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
      if (!usedSession && !silent) {
        silent = new Audio(silentWavUrl());
        silent.loop = true;
        var p = silent.play();
        if (p && p.catch) p.catch(function () { silent = null; });
      }
    } catch (e) { /* geen geluid mogelijk */ }
  };
  // Na een onderbreking (scherm vergrendeld, telefoontje) het geluid weer aanzetten
  W.nudge = function () {
    try {
      if (ctx && ctx.state !== 'running' && ctx.resume) ctx.resume().catch(noop);
      if (silent && silent.paused) { var p = silent.play(); if (p && p.catch) p.catch(noop); }
    } catch (e) { /* */ }
  };
  W.release = function () {
    try { if (silent) { silent.pause(); silent = null; } } catch (e) { /* */ }
  };

  W.beep = function (kind, sound, vibrate) {
    if (vibrate && W.canVibrate()) {
      navigator.vibrate(kind === 'start' ? [700] : kind === 'stop' ? [220, 200, 220, 200, 220] : [60]);
    }
    if (!sound) return;
    var c = context();
    if (!c) return;
    if (c.state !== 'running' && c.resume) c.resume().catch(noop);
    var seq = kind === 'start' ? [[880, 0, 0.7]]
      : kind === 'stop' ? [[440, 0, 0.22], [440, 0.42, 0.22], [440, 0.84, 0.22]]
        : [[1000, 0, 0.09]];
    seq.forEach(function (n) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = n[0];
      o.connect(g); g.connect(c.destination);
      var t = c.currentTime + n[1], end = t + n[2];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.01);
      g.gain.setValueAtTime(0.5, end - 0.02);
      g.gain.linearRampToValueAtTime(0.0001, end);
      o.start(t); o.stop(end + 0.01);
    });
  };

  // ---------- scherm aan ----------
  var want = false, sentinel = null;
  function acquire() {
    if (!want || !navigator.wakeLock || document.visibilityState !== 'visible') return;
    try {
      navigator.wakeLock.request('screen').then(function (s) {
        if (!want) { s.release().catch(noop); return; }
        sentinel = s;
        s.addEventListener('release', function () { if (sentinel === s) sentinel = null; });
      }).catch(noop);
    } catch (e) { /* niet ondersteund */ }
  }
  W.keepAwake = function (on) {
    want = !!on;
    if (want) { if (!sentinel) acquire(); }
    else if (sentinel) { var s = sentinel; sentinel = null; s.release().catch(noop); }
  };
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      if (want && !sentinel) acquire();
      W.nudge();
    }
  });

  // ---------- bestanden en klembord ----------
  function download(name, text, mime) {
    try {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: mime }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      return true;
    } catch (e) { return false; }
  }

  // Bewaar een bestand: eerst het deelmenu (iPhone: "Bewaar in Bestanden"), anders een download.
  // done(true) gelukt, done(false) mislukt, done(null) geannuleerd. Aanroepen vanuit een tik.
  W.saveFile = function (name, text, mime, done) {
    var file = null;
    try { file = new File([text], name, { type: mime }); } catch (e) { file = null; }
    try {
      if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name }).then(
          function () { done(true); },
          function (err) { done(err && err.name === 'AbortError' ? null : download(name, text, mime)); }
        );
        return;
      }
    } catch (e) { /* val terug op download */ }
    done(download(name, text, mime));
  };

  W.copyText = function (text, done) {
    function fallback() {
      try {
        var t = document.createElement('textarea');
        t.value = text;
        t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(t);
        t.select();
        t.setSelectionRange(0, text.length);
        var ok = document.execCommand && document.execCommand('copy');
        t.remove();
        done(!!ok);
      } catch (e) { done(false); }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
        return;
      }
    } catch (e) { /* */ }
    fallback();
  };

  // ---------- offline en updates ----------
  // onUpdate wordt aangeroepen als er een nieuwere versie van de app is overgenomen.
  W.registerWorker = function (onUpdate) {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    var had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (had) onUpdate(); else had = true;
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(noop);
    });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(noop); } catch (e) { /* */ }
  };

  window.ProfitWeb = W;
})();
