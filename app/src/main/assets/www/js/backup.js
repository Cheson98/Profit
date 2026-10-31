/* Back-up: resultaten en instellingen naar een bestand en terug.
 * Een ingelezen bestand wordt altijd gecontroleerd en opgeschoond voordat de app er iets van overneemt. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./norms'));
  else root.Q8Backup = factory(root.Q8Norms);
})(typeof self !== 'undefined' ? self : this, function (N) {
  'use strict';

  var FORMAT = 'profit-backup';
  var VERSION = 1;
  var MAX_SESSIONS = 5000;

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** Inhoud van het bestand (alles behalve een lopende test). */
  function build(state, now) {
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date(now).toISOString(),
      profile: state.profile,
      settings: state.settings,
      reminder: state.reminder,
      sessions: state.sessions
    };
  }

  function fileName(now) {
    var d = new Date(now);
    return 'profit-back-up-' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.json';
  }

  function cleanProfile(p) {
    if (!p || typeof p !== 'object') return null;
    var gender = p.gender === 'm' || p.gender === 'f' ? p.gender : null;
    var age = isNum(p.age) && p.age >= 18 && p.age <= 99 ? Math.floor(p.age) : null;
    var weight = isNum(p.weight) && p.weight >= 30 && p.weight <= 250 ? p.weight : null;
    return { gender: gender, age: age, weight: weight };
  }

  function cleanResult(r) {
    r = r && typeof r === 'object' ? r : {};
    return {
      done: !!r.done,
      r: r.r === 'pass' || r.r === 'fail' ? r.r : null,
      count: isNum(r.count) && r.count >= 0 ? Math.round(r.count) : null,
      time: isNum(r.time) && r.time >= 0 ? r.time : null
    };
  }

  /** Geeft een schone kopie van een test, of null als die niet deugt. */
  function cleanSession(s) {
    if (!s || typeof s !== 'object') return null;
    if (typeof s.id !== 'string' || !s.id || s.id.length > 40) return null;
    if (!isNum(s.ts) || s.ts <= 0) return null;
    if (!Array.isArray(s.order) || !s.order.length || s.order.length > 10) return null;
    var seen = {};
    for (var i = 0; i < s.order.length; i++) {
      var ex = s.order[i];
      if (typeof ex !== 'string' || !Object.prototype.hasOwnProperty.call(N.EX, ex) || seen[ex]) return null;
      seen[ex] = true;
    }
    var prof = cleanProfile(s.profile);
    if (!prof || !prof.gender || prof.age == null || prof.weight == null) return null;
    if (!s.norms || typeof s.norms !== 'object' || !s.results || typeof s.results !== 'object') return null;

    var norms = {}, results = {};
    for (var k = 0; k < s.order.length; k++) {
      var e = s.order[k], norm = s.norms[e];
      if (e === 'rowing' && norm === null) norms[e] = null;
      else if (isNum(norm) && norm > 0) norms[e] = norm;
      else return null;
      results[e] = cleanResult(s.results[e]);
    }
    return {
      id: s.id, ts: s.ts, profile: prof, norms: norms, order: s.order.slice(), results: results,
      finished: !!s.finished, stopped: !!s.stopped
    };
  }

  function cleanSettings(o, defaults, limits) {
    o = o && typeof o === 'object' ? o : {};
    var out = {};
    Object.keys(defaults).forEach(function (key) {
      var def = defaults[key], v = o[key];
      if (typeof def === 'boolean') {
        out[key] = typeof v === 'boolean' ? v : def;
      } else if (isNum(v)) {
        var lim = limits[key];
        if (key === 'pullupPos') out[key] = clamp(Math.round(v), 1, 5);
        else out[key] = lim ? clamp(Math.round(v), lim.min, lim.max) : Math.round(v);
      } else {
        out[key] = def;
      }
    });
    return out;
  }

  function cleanReminder(o, today) {
    o = o && typeof o === 'object' ? o : {};
    var days = Array.isArray(o.days) ? o.days.filter(function (d, i, a) {
      return Number.isInteger(d) && d >= 1 && d <= 7 && a.indexOf(d) === i;
    }).sort() : [1, 3, 5];
    return {
      enabled: o.enabled === true,
      mode: o.mode === 'interval' ? 'interval' : 'weekdays',
      days: days,
      interval: isNum(o.interval) ? clamp(Math.round(o.interval), 1, 30) : 2,
      anchor: typeof o.anchor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.anchor) ? o.anchor : today,
      hour: isNum(o.hour) ? clamp(Math.round(o.hour), 0, 23) : 18,
      minute: isNum(o.minute) ? clamp(Math.round(o.minute), 0, 59) : 0
    };
  }

  /**
   * Leest en controleert een back-upbestand.
   * opts: { defaults, limits } voor de instellingen en { today } (YYYY-MM-DD) voor de herinnering.
   * Resultaat: { ok: true, skipped, data: { sessions, profile, settings, reminder } } of { ok: false, error }.
   */
  function parse(text, opts) {
    opts = opts || {};
    var o;
    try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'Dit is geen geldig back-upbestand.' }; }
    if (!o || typeof o !== 'object' || o.format !== FORMAT) {
      return { ok: false, error: 'Dit is geen back-up van Profit.' };
    }
    if (!isNum(o.version) || o.version > VERSION) {
      return { ok: false, error: 'Deze back-up komt van een nieuwere versie van Profit. Werk de app eerst bij.' };
    }
    var list = Array.isArray(o.sessions) ? o.sessions : [];
    if (list.length > MAX_SESSIONS) return { ok: false, error: 'Het bestand bevat te veel tests.' };

    var sessions = [], skipped = 0, ids = {};
    list.forEach(function (s) {
      var c = cleanSession(s);
      if (!c || ids[c.id]) { skipped++; return; }
      ids[c.id] = true;
      sessions.push(c);
    });
    return {
      ok: true,
      skipped: skipped,
      data: {
        sessions: sessions,
        profile: cleanProfile(o.profile),
        settings: opts.defaults ? cleanSettings(o.settings, opts.defaults, opts.limits || {}) : null,
        reminder: cleanReminder(o.reminder, opts.today || '')
      }
    };
  }

  /** Voegt tests toe die er nog niet zijn (op id). Bestaande tests blijven ongemoeid. */
  function merge(current, incoming) {
    var have = {}, out = current.slice(), added = 0;
    current.forEach(function (s) { have[s.id] = true; });
    incoming.forEach(function (s) {
      if (!have[s.id]) { have[s.id] = true; out.push(s); added++; }
    });
    out.sort(function (a, b) { return a.ts - b.ts; });
    return { sessions: out, added: added };
  }

  return { FORMAT: FORMAT, VERSION: VERSION, build: build, fileName: fileName, parse: parse, merge: merge };
});
