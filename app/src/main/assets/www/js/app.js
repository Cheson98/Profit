/* Q8 Oefentest: schermen en gedrag.
 * Rekenwerk staat in norms.js, engine.js, results.js en charts.js. De Java-brug ("Android") levert
 * opslag, geluid, trillen, scherm-aan en meldingen; zonder brug (browser) werkt alles met localStorage en WebAudio. */
(function () {
  'use strict';

  var N = window.Q8Norms, E = window.Q8Engine, R = window.Q8Results, C = window.Q8Charts;
  var HAS = typeof window.Android !== 'undefined' && window.Android !== null;

  var A = {};      // acties, aangeroepen via data-a
  var run = null;  // lopende test
  var ui = { tab: 'home', screen: null, chartEx: 'rowing', sheet: null, confirm: null, toast: '' };
  var lastKey = '';
  var toastTimer = null;

  var DAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  var DAYS_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  var TABS = [['home', 'Test'], ['results', 'Resultaten'], ['chart', 'Voortgang'], ['settings', 'Instellingen']];
  var MARK = { pass: '✓', fail: '✗', pending: '?', notdone: '–' };
  var STATE_WORD = { pass: 'gehaald', fail: 'niet gehaald', pending: 'nog invullen', notdone: 'niet uitgevoerd' };

  var DEFAULTS = {
    countdown: 10, restRow: 420, exSeconds: 60, restBetween: 180, restRun: 540,
    pullupPos: 5, sound: true, vibrate: true, ticks: true
  };
  var LIM = {
    countdown: { min: 0, max: 60, step: 5, fmt: function (v) { return v === 0 ? 'Uit' : v + ' s'; } },
    restRow: { min: 60, max: 900, step: 30, fmt: function (v) { return N.clockUp(v); } },
    exSeconds: { min: 30, max: 180, step: 5, fmt: function (v) { return N.clockUp(v); } },
    restBetween: { min: 30, max: 600, step: 30, fmt: function (v) { return N.clockUp(v); } },
    restRun: { min: 60, max: 900, step: 30, fmt: function (v) { return N.clockUp(v); } }
  };

  // ---------- hulpfuncties ----------
  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function fmtDate(ts, long) {
    var d = new Date(ts);
    try {
      return d.toLocaleDateString('nl-NL', long
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return todayISO(); }
  }
  function fmtShort(ts) {
    try { return new Date(ts).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }); } catch (e) { return ''; }
  }
  function fmtTimeOfDay(ts) { var d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function joinNl(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function exName(ex) { var m = N.EX[ex]; return m.name + (m.short ? ' ' + m.short : ''); }

  function defaultReminder() {
    return { enabled: false, mode: 'weekdays', days: [1, 3, 5], interval: 2, anchor: todayISO(), hour: 18, minute: 0 };
  }

  // ---------- opslag ----------
  var B = {
    load: function () {
      try { return HAS ? String(window.Android.loadState() || '') : (localStorage.getItem('q8state') || ''); } catch (e) { return ''; }
    },
    save: function (json) {
      try { if (HAS) window.Android.saveState(json); else localStorage.setItem('q8state', json); } catch (e) { /* opslag niet beschikbaar */ }
    },
    beep: function (kind) {
      try {
        if (HAS) window.Android.beep(kind, !!S.settings.sound, !!S.settings.vibrate);
        else webBeep(kind);
      } catch (e) { /* geen geluid */ }
    },
    keepOn: function (on) { try { if (HAS) window.Android.keepScreenOn(!!on); } catch (e) { /* */ } },
    notifOk: function () { try { return HAS ? !!window.Android.notificationsAllowed() : true; } catch (e) { return true; } },
    askNotif: function () { try { if (HAS) window.Android.requestNotificationPermission(); } catch (e) { /* */ } },
    notifSettings: function () { try { if (HAS) window.Android.openNotificationSettings(); } catch (e) { /* */ } },
    exactOk: function () { try { return HAS ? !!window.Android.canExactAlarms() : true; } catch (e) { return true; } },
    exactSettings: function () { try { if (HAS) window.Android.openExactAlarmSettings(); } catch (e) { /* */ } },
    setReminder: function (json) { try { if (HAS) window.Android.setReminder(json); } catch (e) { /* */ } },
    nextAt: function () { try { return HAS ? String(window.Android.nextReminderAt()) : '-1'; } catch (e) { return '-1'; } },
    testNotif: function () { try { if (HAS) window.Android.testNotification(); } catch (e) { /* */ } },
    version: function () { try { return HAS && window.Android.appVersion ? String(window.Android.appVersion() || '') : ''; } catch (e) { return ''; } },

    // bestand bewaren: via Android (bestandskiezer), in een browser als download
    exportFile: function (name, json) {
      try {
        if (HAS && window.Android.exportData) { window.Android.exportData(name, json); return; }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        window.__onExportDone(true);
      } catch (e) { window.__onExportDone(false); }
    },
    // bestand kiezen: via Android (bestandskiezer), in een browser met een bestandsveld
    importFile: function () {
      try {
        if (HAS && window.Android.importData) { window.Android.importData(); return; }
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,application/json';
        inp.onchange = function () {
          var f = inp.files && inp.files[0];
          if (!f) return;
          var fr = new FileReader();
          fr.onload = function () { window.__onImportData(String(fr.result), null); };
          fr.onerror = function () { window.__onImportData(null, 'read'); };
          fr.readAsText(f);
        };
        inp.click();
      } catch (e) { window.__onImportData(null, 'read'); }
    }
  };

  var actx = null;
  function webBeep(kind) {
    if (S.settings.vibrate && navigator.vibrate) {
      navigator.vibrate(kind === 'start' ? [700] : kind === 'stop' ? [220, 200, 220, 200, 220] : [60]);
    }
    if (!S.settings.sound) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    var seq = kind === 'start' ? [[880, 0, 0.7]]
      : kind === 'stop' ? [[440, 0, 0.22], [440, 0.42, 0.22], [440, 0.84, 0.22]]
        : [[1000, 0, 0.09]];
    seq.forEach(function (n) {
      var o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = n[0];
      o.connect(g); g.connect(actx.destination);
      var t = actx.currentTime + n[1];
      g.gain.setValueAtTime(0.2, t);
      o.start(t); o.stop(t + n[2]);
    });
  }

  function loadState() {
    var o = {};
    try { var raw = B.load(); o = raw ? JSON.parse(raw) : {}; } catch (e) { o = {}; }
    if (!o || typeof o !== 'object') o = {};
    var rem = Object.assign(defaultReminder(), o.reminder || {});
    if (!Array.isArray(rem.days)) rem.days = [1, 3, 5];
    return {
      profile: o.profile && typeof o.profile === 'object' ? o.profile : { gender: null, age: null, weight: null },
      settings: Object.assign({}, DEFAULTS, o.settings || {}),
      reminder: rem,
      sessions: Array.isArray(o.sessions) ? o.sessions : [],
      active: o.active && o.active.session && o.active.plan && o.active.snap ? o.active : null
    };
  }
  var S = loadState();
  function persist() { try { B.save(JSON.stringify(S)); } catch (e) { /* */ } }

  // ---------- profiel en normen ----------
  function calcProfile() { var p = S.profile; return { gender: p.gender, age: p.age, weight: p.weight }; }
  function profileValid() { return N.validate(calcProfile()) === ''; }
  function profileHint() {
    var p = S.profile;
    if (!p.gender && !p.age && !p.weight) return 'Vul je gegevens in om je normen te zien.';
    return N.validate(calcProfile());
  }
  function exOrder() { return ['rowing'].concat(N.repsOrder(S.settings.pullupPos), ['run']); }
  function normShort(ex, norm) {
    if (N.EX[ex].type === 'reps') return norm + ' herhalingen';
    return norm == null ? 'zo snel mogelijk' : N.clock(norm);
  }

  // ---------- sessies ----------
  function sortedSessions() { return S.sessions.slice().sort(function (a, b) { return b.ts - a.ts; }); }
  function findSession(id) {
    if (run && run.session.id === id) return run.session;
    for (var i = 0; i < S.sessions.length; i++) if (S.sessions[i].id === id) return S.sessions[i];
    return null;
  }
  function prevOf(s) {
    var best = null;
    S.sessions.forEach(function (x) { if (x.id !== s.id && x.ts < s.ts && (!best || x.ts > best.ts)) best = x; });
    return best;
  }
  function pendingTotal() {
    var n = 0, first = null;
    sortedSessions().forEach(function (s) { var k = R.pending(s).length; if (k) { n += k; if (!first) first = s; } });
    return { n: n, first: first };
  }
  function sumText(s) {
    var m = R.summary(s);
    return m.pass + ' van ' + m.total + ' gehaald' + (m.pending ? ', ' + m.pending + ' nog invullen' : '');
  }
  function profileLine(p) {
    return (p.gender === 'f' ? 'Vrouw' : 'Man') + ', ' + p.age + ' jaar, ' + String(p.weight).replace('.', ',') + ' kg';
  }

  // ---------- reminders ----------
  function remSummary() {
    var r = S.reminder;
    if (!r.enabled) return 'Er staat geen herinnering aan.';
    var t = pad2(r.hour) + ':' + pad2(r.minute);
    if (r.mode === 'interval') {
      var n = r.interval;
      return (n === 1 ? 'Elke dag' : n === 7 ? 'Eens per week' : 'Om de ' + n + ' dagen') + ' om ' + t;
    }
    var d = r.days.slice().sort();
    if (!d.length) return 'Kies minstens één dag.';
    return 'Elke ' + joinNl(d.map(function (x) { return DAYS_LONG[x - 1]; })) + ' om ' + t;
  }
  function nextReminderText() {
    if (!S.reminder.enabled) return '';
    var ms = parseInt(B.nextAt(), 10);
    if (!(ms > 0)) return '';
    var d = new Date(ms);
    var day = '';
    try { day = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { day = fmtDate(ms); }
    return 'Volgende herinnering: ' + day + ' om ' + fmtTimeOfDay(ms);
  }
  function syncReminder() {
    persist();
    B.setReminder(JSON.stringify(S.reminder));
  }

  // ---------- weergave: gedeelde onderdelen ----------
  function segBtn(action, val, label, on) {
    return '<button data-a="' + action + '" data-v="' + esc(val) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>';
  }
  // ---------- weergave: hoofdschermen ----------
  function normsHTML() {
    var h = '<h2>Jouw normen</h2>';
    if (!profileValid()) {
      return h + '<p class="hint" style="margin:0 0 16px">' + esc(profileHint()) + '</p>' +
        '<button class="btn primary wide" disabled>Start test</button>';
    }
    var norms = N.normsFor(calcProfile());
    var plan = E.buildPlan(S.settings, norms);
    var mins = Math.round(E.planInfo(plan).total / 60);
    h += '<ol class="norms">';
    exOrder().forEach(function (ex, i) {
      h += '<li><span class="n">' + (i + 1) + '</span><span class="nm">' + esc(exName(ex)) + '</span><b>' + esc(normShort(ex, norms[ex])) + '</b></li>';
    });
    h += '</ol><p class="hint">De roeitijd is geschaald op jouw gewicht, leeftijd en geslacht. Pull-ups staan als onderdeel ' +
      S.settings.pullupPos + ' tussen roeien en hardlopen; dat pas je aan bij Instellingen.</p>' +
      '<p class="hint" style="margin:6px 0 16px">Duur: ongeveer ' + mins + ' minuten' + (norms.rowing == null ? ' plus de roeitijd' : '') + '.</p>' +
      '<button class="btn primary wide" data-a="start">Start test</button>';
    return h;
  }

  function viewHome() {
    var p = S.profile, h = '';
    if (S.active) {
      h += '<div class="banner"><p>Er loopt nog een test van ' + esc(fmtTimeOfDay(S.active.session.ts)) + '.</p>' +
        '<button class="btn sm" data-a="discard-active">Weggooien</button>' +
        '<button class="btn sm primary" data-a="resume">Hervat</button></div>';
    }
    var pend = pendingTotal();
    if (pend.n) {
      h += '<div class="banner"><p>' + pend.n + (pend.n === 1 ? ' onderdeel' : ' onderdelen') + ' nog in te vullen.</p>' +
        '<button class="btn sm primary" data-a="open-session" data-id="' + esc(pend.first.id) + '">Invullen</button></div>';
    }
    h += '<section class="sec"><h2>Jouw gegevens</h2>' +
      '<div class="seg" role="group" aria-label="Geslacht">' +
      segBtn('gender', 'm', 'Man', p.gender === 'm') + segBtn('gender', 'f', 'Vrouw', p.gender === 'f') + '</div>' +
      '<div class="fields">' +
      '<label class="field"><span>Leeftijd</span><div class="unit"><input data-in="age" inputmode="numeric" maxlength="2" autocomplete="off" value="' +
      (p.age == null ? '' : esc(p.age)) + '"><i>jaar</i></div></label>' +
      '<label class="field"><span>Gewicht</span><div class="unit"><input data-in="weight" inputmode="decimal" maxlength="5" autocomplete="off" value="' +
      (p.weight == null ? '' : esc(String(p.weight).replace('.', ','))) + '"><i>kg</i></div></label>' +
      '</div></section>';
    h += '<section class="sec" id="normsec">' + normsHTML() + '</section>';

    var last = sortedSessions()[0];
    if (last) {
      h += '<section class="sec"><h2>Vorige keer</h2><p class="meta">' + esc(fmtDate(last.ts, true)) + '. ' + esc(sumText(last)) + '.</p>' +
        '<ul class="res">';
      last.order.forEach(function (ex) {
        var d = R.describe(last, ex);
        h += '<li><span class="mark s-' + d.state + '" aria-hidden="true">' + MARK[d.state] + '</span><span class="nm">' + esc(exName(ex)) +
          '</span><span class="rv s-' + d.state + '">' + esc(d.text) + '</span></li>';
      });
      h += '</ul><button class="link" data-a="open-session" data-id="' + esc(last.id) + '">Bekijk of pas aan</button></section>';
    }

    var next = nextReminderText();
    h += '<section class="sec"><h2>Herinnering</h2><p>' + esc(remSummary()) + '</p>' +
      (next ? '<p class="meta">' + esc(next) + '</p>' : '') +
      '<button class="link" data-a="tab" data-v="settings">Herinnering aanpassen</button></section>';
    return h;
  }

  function viewResults() {
    var list = sortedSessions();
    var h = '<h2 class="page-title">Resultaten</h2>';
    if (!list.length) {
      return h + '<div class="empty"><b>Nog geen tests</b>Je resultaten verschijnen hier zodra je een test hebt gedaan.</div>';
    }
    list.forEach(function (s) {
      h += '<button class="sess" data-a="open-session" data-id="' + esc(s.id) + '"><div class="top"><b>' + esc(fmtDate(s.ts)) + ', ' + esc(fmtTimeOfDay(s.ts)) +
        '</b><span class="meta">' + esc(s.finished ? '' : 'gestopt') + '</span></div><div class="meta">' + esc(sumText(s)) + '</div><div class="strip" aria-hidden="true">';
      s.order.forEach(function (ex) {
        var d = R.describe(s, ex);
        h += '<i class="s-' + d.state + '">' + MARK[d.state] + '</i>';
      });
      h += '</div></button>';
    });
    return h;
  }

  function viewSession() {
    var s = findSession(ui.screen.id);
    if (!s) { ui.screen = null; return viewResults(); }
    var fresh = !!ui.screen.fresh, prev = prevOf(s);
    var h = '<button class="back" data-a="back">‹ ' + (fresh ? 'Sluiten' : 'Terug naar resultaten') + '</button>';
    h += '<h2 class="page-title">' + (fresh ? (s.finished ? 'Test afgerond' : 'Test gestopt') : esc(fmtDate(s.ts, true))) + '</h2>';
    h += '<p class="meta">' + (fresh ? esc(fmtDate(s.ts, true)) + '. ' : '') + esc(profileLine(s.profile)) + '. ' + esc(sumText(s)) + '.</p>';
    var pend = R.pending(s).length;
    if (pend) h += '<p class="hint warn">Vul nog ' + pend + (pend === 1 ? ' onderdeel' : ' onderdelen') + ' in met Invullen.</p>';
    h += '<section class="sec"><ul>';
    s.order.forEach(function (ex) {
      var d = R.describe(s, ex), r = s.results[ex];
      var before = prev && prev.results[ex] && prev.results[ex].done ? R.describe(prev, ex).text : '';
      h += '<li class="srow"><span class="mark s-' + d.state + '" aria-hidden="true">' + MARK[d.state] + '</span>' +
        '<span class="nm">' + esc(exName(ex)) + '<small>Norm: ' + esc(R.normText(ex, s.norms[ex])) + '</small>' +
        (before ? '<small>Vorige keer: ' + esc(before) + '</small>' : '') + '</span>' +
        '<span class="rt"><span class="rv s-' + d.state + '">' + esc(d.text) + '</span>' +
        '<button class="link" data-a="ans-open" data-id="' + esc(s.id) + '" data-ex="' + ex + '">' +
        (d.state === 'pending' || !r.done ? 'Invullen' : 'Aanpassen') + '</button></span></li>';
    });
    h += '</ul></section>';
    if (!fresh) h += '<button class="link danger" data-a="del-ask" data-id="' + esc(s.id) + '">Deze test verwijderen</button>';
    return h;
  }

  function chartPoints(ex) {
    var out = [];
    S.sessions.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (s) {
      var v = R.value(s, ex);
      if (v) out.push({ v: v.v, kind: v.kind, pass: v.pass, text: v.text, label: fmtShort(s.ts), ts: s.ts });
    });
    if (out.length) {
      var k = out[out.length - 1].kind;
      out = out.filter(function (p) { return p.kind === k; });
    }
    return out;
  }

  function viewChart() {
    var ex = ui.chartEx, pts = chartPoints(ex);
    var h = '<h2 class="page-title">Voortgang</h2><div class="chips scroll" role="group" aria-label="Onderdeel">';
    N.CHART_ORDER.forEach(function (k) {
      h += '<button class="chip" data-a="chart-ex" data-v="' + k + '" aria-pressed="' + (k === ex ? 'true' : 'false') + '">' + esc(N.EX[k].name) + '</button>';
    });
    h += '</div><section class="sec"><h2>' + esc(exName(ex)) + '</h2>';
    if (!pts.length) {
      return h + '<div class="empty" style="padding:8px 0"><b>Nog geen resultaten</b>Zodra je dit onderdeel hebt gedaan en ingevuld, zie je hier hoe het zich ontwikkelt.</div></section>';
    }
    var kind = pts[pts.length - 1].kind;
    h += C.line(pts, { kind: kind, label: 'Verloop ' + N.EX[ex].name });
    h += '<p class="hint">' + (kind === 'time'
      ? 'Je tijd in seconden. Lager is sneller.'
      : 'De gestreepte lijn is de norm (100%). Haal je de norm niet, dan zie je welk deel je wel deed. Bij roeien en hardlopen laat een waarde boven 100% zien hoeveel sneller je was dan de normtijd.') + '</p>';
    if (pts.length > 1) {
      var a = pts[pts.length - 2], b = pts[pts.length - 1], diff = Math.round((b.v - a.v) * 10) / 10, line;
      if (diff === 0) line = 'Gelijk aan de vorige keer.';
      else if (kind === 'time') line = Math.abs(diff) + ' seconden ' + (diff < 0 ? 'sneller' : 'langzamer') + ' dan de vorige keer.';
      else line = (diff > 0 ? 'Vooruitgang van ' : 'Achteruitgang van ') + Math.abs(diff) + ' procentpunt ten opzichte van de vorige keer.';
      h += '<p style="margin-top:10px"><b>' + esc(line) + '</b></p>';
    }
    h += '</section><section class="sec"><h2>Alle keren</h2><ul class="res">';
    pts.slice().reverse().forEach(function (p) {
      h += '<li><span class="mark ' + (p.pass ? 's-pass' : 's-fail') + '" aria-hidden="true">' + (p.pass ? '✓' : '✗') + '</span><span class="nm">' +
        esc(fmtDate(p.ts)) + '</span><span class="rv">' + esc(p.text) + '</span></li>';
    });
    return h + '</ul></section>';
  }

  function stepRow(key, label, hint) {
    var L = LIM[key], v = S.settings[key];
    return '<div class="setrow"><div class="tx">' + esc(label) + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</div>' +
      '<div class="stepper"><button data-a="step" data-k="' + key + '" data-d="-1" aria-label="Minder: ' + esc(label) + '">−</button>' +
      '<output>' + esc(L.fmt(v)) + '</output>' +
      '<button data-a="step" data-k="' + key + '" data-d="1" aria-label="Meer: ' + esc(label) + '">+</button></div></div>';
  }
  function swRow(key, label, hint, on) {
    return '<label class="setrow"><span class="tx">' + esc(label) + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span>' +
      '<span class="sw"><input type="checkbox" data-in="' + key + '"' + (on ? ' checked' : '') + '><span></span></span></label>';
  }

  function reminderHTML() {
    var r = S.reminder;
    var h = '<section class="sec"><h2>Herinneringen</h2>' + swRow('rem-enabled', 'Herinner me aan oefenen', 'Je krijgt een melding op het ingestelde moment.', r.enabled);
    if (!r.enabled) return h + '</section>';
    h += '<div class="seg" style="margin-top:14px" role="group" aria-label="Hoe vaak">' +
      segBtn('rem-mode', 'weekdays', 'Vaste dagen', r.mode !== 'interval') + segBtn('rem-mode', 'interval', 'Om de zoveel dagen', r.mode === 'interval') + '</div>';
    if (r.mode === 'interval') {
      h += '<div class="chips" style="margin-top:12px">';
      [[2, 'Om de 2 dagen'], [3, 'Om de 3 dagen'], [4, 'Om de 4 dagen'], [7, 'Eens per week']].forEach(function (c) {
        h += '<button class="chip" data-a="rem-int" data-v="' + c[0] + '" aria-pressed="' + (r.interval === c[0] ? 'true' : 'false') + '">' + c[1] + '</button>';
      });
      h += '</div><div class="setrow" style="margin-top:6px"><div class="tx">Aantal dagen ertussen</div><div class="stepper">' +
        '<button data-a="rem-int-step" data-d="-1" aria-label="Minder dagen">−</button><output>' + r.interval + '</output>' +
        '<button data-a="rem-int-step" data-d="1" aria-label="Meer dagen">+</button></div></div>' +
        '<div class="setrow"><div class="tx">Eerste training op</div><input type="date" data-in="rem-anchor" value="' + esc(r.anchor) + '"></div>';
    } else {
      h += '<div class="days" role="group" aria-label="Dagen">';
      for (var d = 1; d <= 7; d++) {
        h += '<button data-a="rem-day" data-v="' + d + '" aria-pressed="' + (r.days.indexOf(d) >= 0 ? 'true' : 'false') + '" aria-label="' + DAYS_LONG[d - 1] + '">' + DAYS[d - 1] + '</button>';
      }
      h += '</div>';
    }
    h += '<div class="setrow"><div class="tx">Tijdstip</div><input type="time" data-in="rem-time" value="' + pad2(r.hour) + ':' + pad2(r.minute) + '"></div>';
    var next = nextReminderText();
    h += '<p class="hint">' + esc(remSummary()) + '.' + (next ? ' ' + esc(next) + '.' : '') + '</p>';
    if (HAS) {
      if (!B.notifOk()) {
        h += '<p class="hint warn">Meldingen staan uit voor deze app, dus je krijgt geen herinnering.</p>' +
          '<div class="row2" style="margin-top:10px"><button class="btn sm" data-a="rem-perm">Meldingen toestaan</button><button class="btn sm" data-a="rem-notif-settings">Open instellingen</button></div>';
      }
      if (!B.exactOk()) {
        h += '<p class="hint">Android mag de melding nu een paar minuten te laat sturen. Geef toestemming voor een exact tijdstip.</p>' +
          '<button class="btn sm" style="margin-top:10px" data-a="rem-exact">Exact tijdstip toestaan</button>';
      }
      h += '<button class="link" data-a="rem-test">Stuur een testmelding</button>';
    }
    return h + '</section>';
  }

  function viewSettings() {
    var s = S.settings;
    var h = '<h2 class="page-title">Instellingen</h2>';
    h += '<section class="sec"><h2>Tijden</h2>' +
      stepRow('countdown', 'Aftellen voor het roeien', 'De roeitimer start daarna automatisch. Uit = direct beginnen.') +
      stepRow('restRow', 'Rust na het roeien') +
      stepRow('exSeconds', 'Tijd per onderdeel', 'Squats, push-ups, sit-ups, burpees en pull-ups.') +
      stepRow('restBetween', 'Rust tussen de onderdelen') +
      stepRow('restRun', 'Rust voor het hardlopen', 'Na het laatste onderdeel.') +
      '<button class="link" data-a="defaults">Standaardtijden terugzetten</button></section>';

    h += '<section class="sec"><h2>Pull-ups</h2><p class="meta" style="margin-bottom:12px">Pull-ups mogen op elk moment tussen roeien en hardlopen. Kies het nummer van het onderdeel.</p>' +
      '<div class="seg" role="group" aria-label="Positie van pull-ups">';
    for (var i = 1; i <= 5; i++) h += segBtn('pullup', i, i, s.pullupPos === i);
    h += '</div><p class="order">' + exOrder().map(function (x) { return esc(N.EX[x].name); }).join(', ') + '</p></section>';

    h += '<section class="sec"><h2>Signalen</h2>' +
      swRow('set-sound', 'Geluid', 'Lange piep bij beginnen, drie korte bij stoppen.', s.sound) +
      swRow('set-vibrate', 'Trillen', '', s.vibrate) +
      swRow('set-ticks', 'Piepjes in de laatste 3 seconden', '', s.ticks) +
      '<div class="row2" style="margin-top:12px"><button class="btn sm" data-a="sig" data-v="start">Hoor beginnen</button><button class="btn sm" data-a="sig" data-v="stop">Hoor stoppen</button></div></section>';

    h += reminderHTML();

    var ver = B.version();
    h += '<section class="sec"><h2>Gegevens</h2><p class="meta">Alles blijft op deze telefoon. Bewaar een back-up als bestand, bijvoorbeeld in Google Drive of Downloads. ' +
      'Zo raak je je resultaten en instellingen niet kwijt als je de app verwijdert of een andere telefoon krijgt.</p>' +
      '<div class="row2" style="margin:14px 0 8px"><button class="btn" data-a="backup-export">Back-up maken</button><button class="btn" data-a="backup-import">Back-up terugzetten</button></div>' +
      '<button class="link danger" data-a="wipe-ask">Alle resultaten verwijderen</button>' +
      '<p class="hint" style="margin-top:16px">Onofficiële oefenapp, niet van de politie. De normen komen uit de Q8-doelstellingen en de geschaalde roeinormen die je hebt aangeleverd.' +
      (ver ? ' Versie ' + esc(ver) + '.' : '') + '</p></section>';
    return h;
  }

  // ---------- testscherm ----------
  function runElapsed() {
    var now = run.paused ? run.pausedAt : Date.now();
    return (now - run.engine.stepStart) / 1000;
  }

  function renderTest(view) {
    var eng = run.engine, st = eng.current();
    if (!st) return;
    var s = run.session, plan = run.plan;
    var phase = st.kind === 'work' ? 'work' : st.kind === 'rest' ? 'rest' : 'count';
    document.body.setAttribute('data-phase', phase);

    var total = plan.filter(function (x) { return x.kind === 'work'; }).length;
    var before = plan.slice(0, eng.idx).filter(function (x) { return x.kind === 'work'; }).length;
    var nextWork = null;
    for (var i = eng.idx + 1; i < plan.length; i++) if (plan[i].kind === 'work') { nextWork = plan[i]; break; }

    var step = st.kind === 'work' ? 'Onderdeel ' + (before + 1) + ' van ' + total
      : st.kind === 'rest' ? 'Na onderdeel ' + before + ' van ' + total : 'Voor onderdeel 1 van ' + total;
    var title, target = '', sub = '';
    if (st.kind === 'work') {
      title = exName(st.ex);
      target = N.EX[st.ex].type === 'reps' ? 'Norm: ' + s.norms[st.ex] + ' herhalingen'
        : s.norms[st.ex] == null ? 'Zo snel mogelijk' : 'Norm: ' + N.clock(s.norms[st.ex]);
      sub = st.seconds != null && N.EX[st.ex].type === 'reps' ? 'Je hebt ' + N.clockUp(st.seconds) + ' de tijd.' : '';
    } else if (st.kind === 'rest') {
      title = 'Rust';
      if (nextWork) { target = 'Straks: ' + exName(nextWork.ex); sub = R.normText(nextWork.ex, s.norms[nextWork.ex]); }
    } else {
      title = 'Maak je klaar';
      target = 'Straks: ' + exName(nextWork.ex);
      sub = R.normText(nextWork.ex, s.norms[nextWork.ex]);
    }
    if (run.paused) title = 'Gepauzeerd';

    var h = '<div class="t"><div class="t-top"><span class="t-step">' + esc(step) + '</span><button class="t-stop" data-a="stop-ask">Stop</button></div>' +
      '<div class="t-main"><div class="t-phase">' + esc(title) + '</div><div class="t-clock" id="clock" role="timer" aria-live="off">0:00</div>' +
      '<div class="t-bar"><i id="bar"></i></div><div class="t-target">' + esc(target) + '</div>' + (sub ? '<div class="t-sub">' + esc(sub) + '</div>' : '') + '</div>';

    h += '<div class="t-btns">';
    if (st.kind === 'work') h += '<button class="btn main" data-a="klaar">Klaar</button>';
    else if (st.kind === 'rest') h += '<button class="btn main" data-a="skip">Rust overslaan</button>';
    else h += '<button class="btn main" data-a="skip">Direct beginnen</button>';
    h += '<button class="btn" data-a="pause">' + (run.paused ? 'Hervat' : 'Pauze') + '</button></div>';

    var pend = R.pending(s);
    if (pend.length) {
      h += '<div class="t-ask"><h3>Gehaald?</h3><ul>';
      pend.forEach(function (ex) {
        h += '<li><span>' + esc(exName(ex)) + '</span><button class="btn yes" data-a="yes" data-ex="' + ex + '">Ja</button><button class="btn no" data-a="no" data-ex="' + ex + '">Nee</button></li>';
      });
      h += '</ul></div>';
    }

    h += '<ol class="t-line">';
    s.order.forEach(function (ex) {
      var d = R.describe(s, ex), now = st.kind === 'work' && st.ex === ex;
      h += '<li class="' + (now ? 'now' : '') + '"><span class="mark" aria-hidden="true">' + (now ? '●' : MARK[d.state]) + '</span><span class="nm">' + esc(exName(ex)) +
        '</span><span>' + (now ? 'bezig' : esc(d.state === 'notdone' ? '' : d.text)) + '</span></li>';
    });
    h += '</ol></div>';
    view.innerHTML = h;
    updateClock();
  }

  function updateClock() {
    if (!run) return;
    var st = run.engine.current(), el = $('#clock');
    if (!st || !el) return;
    var elapsed = runElapsed(), bar = $('#bar');
    if (st.seconds == null) {
      el.textContent = N.clockUp(elapsed);
      if (bar) bar.style.width = '0';
    } else {
      el.textContent = N.clock(st.seconds - elapsed);
      if (bar) bar.style.width = clamp(elapsed / st.seconds * 100, 0, 100) + '%';
    }
  }

  function loop() {
    if (!run) return;
    if (!run.paused) run.engine.tick();
    if (run) updateClock();
  }

  // ---------- testverloop ----------
  function beginRun(plan, session, snap) {
    run = { plan: plan, session: session, paused: false, pausedAt: 0, stepAt: Date.now(), timer: null };
    run.engine = new E.Engine(plan, {
      ticks: !!S.settings.ticks,
      onSignal: function (kind) { B.beep(kind); },
      onStep: onStep,
      onEnd: onEnd,
      onFinish: function () { endRun(false); }
    });
    B.keepOn(true);
    ui.screen = null; ui.sheet = null; ui.confirm = null;
    if (snap) {
      run.engine.restore(snap);
      run.engine.tick();
      if (!run) return;
      run.stepAt = Date.now();
      render();
    } else {
      run.engine.start();
    }
    run.timer = setInterval(loop, 100);
  }

  function onStep() {
    if (!run) return;
    run.stepAt = Date.now();
    S.active = { plan: run.plan, session: run.session, snap: run.engine.snapshot() };
    persist();
    render();
  }

  function onEnd(step) {
    if (!run || step.kind !== 'work') return;
    var r = run.session.results[step.ex];
    if (r) r.done = true;   // gedaan, nog niet beantwoord = "nog invullen"
  }

  function endRun(stopped) {
    var r = run;
    if (!r) return;
    clearInterval(r.timer);
    var s = r.session;
    s.finished = !stopped;
    s.stopped = !!stopped;
    run = null;
    S.active = null;
    B.keepOn(false);
    document.body.removeAttribute('data-phase');
    if (!stopped || R.hasData(s)) {
      S.sessions.push(s);
      ui.screen = { type: 'session', id: s.id, fresh: true };
    } else {
      ui.screen = null;
    }
    ui.tab = 'home'; ui.sheet = null; ui.confirm = null;
    persist();
    render();
  }

  function guard() { return run && Date.now() - run.stepAt > 800; }   // voorkomt dubbel tikken

  // ---------- sheets en meldingen ----------
  function toast(msg) {
    ui.toast = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast = ''; renderLayer(); }, 2600);
    renderLayer();
  }

  function openAnswer(sid, ex, preFail) {
    var s = findSession(sid);
    if (!s) return;
    var r = s.results[ex];
    ui.sheet = { sid: sid, ex: ex, fail: !!preFail || (!!r && r.r === 'fail'), count: r && r.r === 'fail' ? r.count : 0 };
    renderLayer();
  }

  function ask(opts) { ui.confirm = opts; renderLayer(); }

  function renderLayer() {
    var el = $('#layer'), h = '';
    var sh = ui.sheet, s = sh ? findSession(sh.sid) : null;
    if (sh && s) {
      var meta = N.EX[sh.ex], reps = meta.type === 'reps', norm = s.norms[sh.ex];
      var unit = reps ? 'herhalingen' : 'meter', max = R.maxCount(s, sh.ex);
      h += '<div class="scrim" data-a="ans-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(meta.name) + '">' +
        '<h3>' + esc(exName(sh.ex)) + '</h3><p>Norm: ' + esc(R.normText(sh.ex, norm)) + '</p>' +
        '<div class="row2"><button class="btn yes" data-a="ans-yes" style="min-height:56px">Ja, gehaald</button><button class="btn no" data-a="ans-no" style="min-height:56px"' +
        (sh.fail ? ' aria-pressed="true"' : '') + '>Nee</button></div>';
      if (sh.fail) {
        h += '<p class="q">Hoeveel ' + unit + ' heb je gedaan? (0 tot ' + max + ')</p><div class="count">' +
          '<button data-a="cnt" data-d="-1" aria-label="Minder">−</button><input id="cnt" data-in="count" type="number" inputmode="numeric" min="0" max="' + max + '" value="' + sh.count + '">' +
          '<button data-a="cnt" data-d="1" aria-label="Meer">+</button></div><button class="btn primary wide" data-a="ans-save">Opslaan</button>';
      }
      h += '</div>';
    } else if (ui.confirm) {
      var c = ui.confirm;
      h += '<div class="scrim" data-a="confirm-no"></div><div class="sheet" role="alertdialog" aria-modal="true"><h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p>' +
        '<div class="row2"><button class="btn" data-a="confirm-no">' + esc(c.cancel || 'Annuleren') + '</button><button class="btn ' + (c.danger ? 'danger' : 'primary') + '" data-a="confirm-yes">' + esc(c.ok) + '</button></div></div>';
    }
    if (ui.toast) h += '<div class="toast" role="status">' + esc(ui.toast) + '</div>';
    el.innerHTML = h;
  }

  // ---------- render ----------
  function render() {
    var view = $('#view');
    var testing = !!run;
    document.body.classList.toggle('testing', testing);
    var key = testing ? 'test' : ui.tab + '|' + (ui.screen ? ui.screen.type + ui.screen.id : '');
    var keep = key === lastKey ? view.scrollTop : 0;
    if (testing) {
      renderTest(view);
    } else {
      var tabs = '';
      TABS.forEach(function (t) { tabs += '<button data-a="tab" data-v="' + t[0] + '"' + (ui.tab === t[0] ? ' aria-current="page"' : '') + '>' + t[1] + '</button>'; });
      $('#tabs').innerHTML = tabs;
      view.innerHTML = ui.screen ? viewSession()
        : ui.tab === 'results' ? viewResults()
          : ui.tab === 'chart' ? viewChart()
            : ui.tab === 'settings' ? viewSettings()
              : viewHome();
    }
    view.scrollTop = keep;
    lastKey = key;
    renderLayer();
  }

  // ---------- acties ----------
  A.tab = function (el) { ui.tab = el.dataset.v; ui.screen = null; render(); };
  A.gender = function (el) { S.profile.gender = el.dataset.v; persist(); render(); };
  A.back = function () { ui.screen = null; render(); };

  A.start = function () {
    var norms = N.normsFor(calcProfile());
    if (!norms) return;
    var plan = E.buildPlan(S.settings, norms);
    var p = calcProfile();
    var session = R.newSession({ gender: p.gender, age: Math.floor(p.age), weight: p.weight }, norms, plan, Date.now());
    S.active = null;
    beginRun(plan, session, null);
  };
  A.resume = function () { if (S.active) beginRun(S.active.plan, S.active.session, S.active.snap); };
  A['discard-active'] = function () {
    ask({ title: 'Lopende test weggooien?', text: 'Wat je tot nu toe hebt gedaan wordt niet bewaard.', ok: 'Weggooien', cancel: 'Behouden', danger: true,
      run: function () { S.active = null; persist(); render(); } });
  };

  A.klaar = function () {
    if (!guard()) return;
    var st = run.engine.current();
    if (!st) return;
    if (st.kind === 'work' && N.EX[st.ex].type === 'dist') R.markKlaar(run.session, st.ex, runElapsed());
    run.engine.finishNow();
  };
  A.skip = function () { if (guard()) run.engine.finishNow(); };
  A.pause = function () {
    if (!run) return;
    if (run.paused) {
      run.engine.stepStart += Date.now() - run.pausedAt;
      run.paused = false;
      S.active = { plan: run.plan, session: run.session, snap: run.engine.snapshot() };
      persist();
    } else {
      run.paused = true;
      run.pausedAt = Date.now();
    }
    render();
  };
  A['stop-ask'] = function () {
    ask({ title: 'Test stoppen?', text: 'Wat je al hebt gedaan blijft bewaard.', ok: 'Stoppen', cancel: 'Doorgaan', danger: true, run: function () { endRun(true); } });
  };

  A.yes = function (el) {
    if (!run) return;
    R.answer(run.session, el.dataset.ex, true);
    S.active = { plan: run.plan, session: run.session, snap: run.engine.snapshot() };
    persist(); render();
  };
  A.no = function (el) { if (run) openAnswer(run.session.id, el.dataset.ex, true); };

  A['ans-open'] = function (el) { openAnswer(el.dataset.id, el.dataset.ex, false); };
  A['ans-close'] = function () { ui.sheet = null; renderLayer(); };
  A['ans-yes'] = function () {
    var sh = ui.sheet, s = sh && findSession(sh.sid);
    if (!s) return;
    R.answer(s, sh.ex, true);
    afterAnswer(s);
  };
  A['ans-no'] = function () { if (ui.sheet) { ui.sheet.fail = true; renderLayer(); } };
  A.cnt = function (el) {
    var sh = ui.sheet, s = sh && findSession(sh.sid);
    if (!s) return;
    var step = N.EX[sh.ex].type === 'reps' ? 1 : (N.EX[sh.ex].distance > 500 ? 50 : 10);
    sh.count = clamp((parseInt(sh.count, 10) || 0) + parseInt(el.dataset.d, 10) * step, 0, R.maxCount(s, sh.ex));
    $('#cnt').value = sh.count;
  };
  A['ans-save'] = function () {
    var sh = ui.sheet, s = sh && findSession(sh.sid);
    if (!s) return;
    var n = clamp(parseInt(sh.count, 10) || 0, 0, R.maxCount(s, sh.ex));
    R.answer(s, sh.ex, false, n);
    afterAnswer(s);
  };
  function afterAnswer(s) {
    ui.sheet = null;
    if (run && run.session === s) S.active = { plan: run.plan, session: run.session, snap: run.engine.snapshot() };
    persist(); render();
  }

  A['open-session'] = function (el) { ui.screen = { type: 'session', id: el.dataset.id, fresh: false }; ui.tab = 'results'; render(); };
  A['del-ask'] = function (el) {
    var id = el.dataset.id;
    ask({ title: 'Test verwijderen?', text: 'Deze test verdwijnt ook uit je grafieken.', ok: 'Verwijderen', cancel: 'Behouden', danger: true,
      run: function () { S.sessions = S.sessions.filter(function (x) { return x.id !== id; }); ui.screen = null; persist(); render(); toast('Test verwijderd'); } });
  };
  A['wipe-ask'] = function () {
    ask({ title: 'Alle resultaten verwijderen?', text: 'Je geschiedenis en grafieken zijn daarna leeg. Je instellingen blijven.', ok: 'Alles verwijderen', cancel: 'Behouden', danger: true,
      run: function () { S.sessions = []; persist(); render(); toast('Resultaten verwijderd'); } });
  };
  // ---- back-up ----
  A['backup-export'] = function () {
    var now = Date.now();
    B.exportFile(Q8Backup.fileName(now), JSON.stringify(Q8Backup.build(S, now), null, 2));
  };
  A['backup-import'] = function () { B.importFile(); };

  window.__onExportDone = function (ok) {
    if (ok === null) return;   // geannuleerd in de bestandskiezer
    toast(ok ? 'Back-up opgeslagen' : 'Opslaan is niet gelukt');
  };
  window.__onImportData = function (text, err) {
    if (text == null) {
      if (err !== 'cancel') toast('Het bestand kon niet worden gelezen');
      return;
    }
    var r = Q8Backup.parse(text, { defaults: DEFAULTS, limits: LIM, today: todayISO() });
    if (!r.ok) { toast(r.error); return; }
    var m = Q8Backup.merge(S.sessions, r.data.sessions);
    var n = r.data.sessions.length;
    var msg = 'In het bestand ' + (n === 1 ? 'staat 1 test' : 'staan ' + n + ' tests') + ', waarvan ' + m.added + ' nieuw voor deze telefoon. ' +
      'Die worden toegevoegd; je huidige resultaten blijven staan. Ook je gegevens, tijden en herinnering uit het bestand worden overgenomen.' +
      (r.skipped ? ' ' + r.skipped + ' ongeldige ' + (r.skipped === 1 ? 'test is' : 'tests zijn') + ' overgeslagen.' : '');
    ask({ title: 'Back-up terugzetten?', text: msg, ok: 'Terugzetten', cancel: 'Annuleren', danger: false, run: function () {
      var p = r.data.profile;
      S.sessions = m.sessions;
      if (p && p.gender && p.age != null && p.weight != null) S.profile = p;
      S.settings = r.data.settings;
      S.reminder = r.data.reminder;
      syncReminder();
      render();
      toast(m.added === 1 ? '1 test teruggezet' : m.added + ' tests teruggezet');
    } });
  };

  A['confirm-no'] = function () { ui.confirm = null; renderLayer(); };
  A['confirm-yes'] = function () {
    var c = ui.confirm;
    ui.confirm = null;
    if (c && c.run) c.run();
    renderLayer();
  };

  A['chart-ex'] = function (el) { ui.chartEx = el.dataset.v; render(); };

  A.step = function (el) {
    var k = el.dataset.k, L = LIM[k];
    S.settings[k] = clamp((S.settings[k] || 0) + parseInt(el.dataset.d, 10) * L.step, L.min, L.max);
    persist(); render();
  };
  A.pullup = function (el) { S.settings.pullupPos = parseInt(el.dataset.v, 10); persist(); render(); };
  A.defaults = function () {
    ['countdown', 'restRow', 'exSeconds', 'restBetween', 'restRun'].forEach(function (k) { S.settings[k] = DEFAULTS[k]; });
    persist(); render(); toast('Standaardtijden teruggezet');
  };
  A.sig = function (el) { B.beep(el.dataset.v); };

  A['rem-mode'] = function (el) { S.reminder.mode = el.dataset.v; syncReminder(); render(); };
  A['rem-day'] = function (el) {
    var d = parseInt(el.dataset.v, 10), days = S.reminder.days, i = days.indexOf(d);
    if (i >= 0) days.splice(i, 1); else days.push(d);
    days.sort();
    syncReminder(); render();
  };
  A['rem-int'] = function (el) { S.reminder.interval = parseInt(el.dataset.v, 10); syncReminder(); render(); };
  A['rem-int-step'] = function (el) {
    S.reminder.interval = clamp((S.reminder.interval || 2) + parseInt(el.dataset.d, 10), 1, 30);
    syncReminder(); render();
  };
  A['rem-perm'] = function () { B.askNotif(); setTimeout(render, 700); };
  A['rem-notif-settings'] = function () { B.notifSettings(); };
  A['rem-exact'] = function () { B.exactSettings(); };
  A['rem-test'] = function () { B.testNotif(); toast('Testmelding verstuurd'); };

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-a]') : null;
    if (!el || el.disabled) return;
    var fn = A[el.getAttribute('data-a')];
    if (fn) fn(el, e);
  });

  document.addEventListener('input', function (e) {
    var t = e.target, k = t.getAttribute && t.getAttribute('data-in');
    if (!k) return;
    if (k === 'age') {
      var a = parseInt(t.value, 10);
      S.profile.age = isNaN(a) ? null : a;
      persist(); refreshNorms();
    } else if (k === 'weight') {
      var w = parseFloat(String(t.value).replace(',', '.'));
      S.profile.weight = isNaN(w) ? null : w;
      persist(); refreshNorms();
    } else if (k === 'count' && ui.sheet) {
      ui.sheet.count = parseInt(t.value, 10) || 0;
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target, k = t.getAttribute && t.getAttribute('data-in');
    if (!k) return;
    if (k.indexOf('set-') === 0) {
      S.settings[k.slice(4)] = !!t.checked;
      persist();
    } else if (k === 'rem-enabled') {
      S.reminder.enabled = !!t.checked;
      if (t.checked && !S.reminder.anchor) S.reminder.anchor = todayISO();
      if (t.checked && !B.notifOk()) B.askNotif();
      syncReminder(); render();
    } else if (k === 'rem-time') {
      var m = /^(\d{1,2}):(\d{2})/.exec(t.value || '');
      if (m) { S.reminder.hour = clamp(parseInt(m[1], 10), 0, 23); S.reminder.minute = clamp(parseInt(m[2], 10), 0, 59); syncReminder(); render(); }
    } else if (k === 'rem-anchor') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(t.value || '')) { S.reminder.anchor = t.value; syncReminder(); render(); }
    }
  });

  function refreshNorms() {
    var el = $('#normsec');
    if (el) el.innerHTML = normsHTML();
  }

  // ---------- koppeling met Android ----------
  window.__onResume = function () {
    if (run && !run.paused) { run.engine.tick(); if (run) updateClock(); }
    if (!run && ui.tab === 'settings') render();
  };
  window.__onBack = function () {
    if (ui.sheet) { ui.sheet = null; renderLayer(); return true; }
    if (ui.confirm) { ui.confirm = null; renderLayer(); return true; }
    if (run) { A['stop-ask'](); return true; }
    if (ui.screen) { ui.screen = null; render(); return true; }
    if (ui.tab !== 'home') { ui.tab = 'home'; render(); return true; }
    return false;
  };
  window.__q8 = { state: function () { return S; } };

  // herinnering opnieuw doorgeven (na een update van de app) en starten
  if (S.reminder.enabled) B.setReminder(JSON.stringify(S.reminder));
  render();
})();
