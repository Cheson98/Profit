/* Resultaten per test: vastleggen, omschrijven en omrekenen naar een waarde voor de grafiek. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./norms'));
  else root.Q8Results = factory(root.Q8Norms);
})(typeof self !== 'undefined' ? self : this, function (N) {
  'use strict';

  function round1(x) { return Math.round(x * 10) / 10; }

  /** Nieuwe test, met een momentopname van profiel en normen (die kunnen later veranderen). */
  function newSession(profile, norms, plan, now) {
    var order = plan.filter(function (s) { return s.kind === 'work'; }).map(function (s) { return s.ex; });
    var results = {};
    order.forEach(function (ex) { results[ex] = { done: false, r: null, count: null, time: null }; });
    return {
      id: 's' + now,
      ts: now,
      profile: { gender: profile.gender, age: profile.age, weight: profile.weight },
      norms: JSON.parse(JSON.stringify(norms)),
      order: order,
      results: results,
      finished: false,
      stopped: false
    };
  }

  /** Ja/nee-antwoord. Bij nee: het aantal uitvoeringen (herhalingen, of meters bij roeien/hardlopen). */
  function answer(session, ex, pass, count) {
    var r = session.results[ex];
    if (!r) return;
    r.done = true;
    if (pass) {
      r.r = 'pass';
      r.count = null;
    } else {
      r.r = 'fail';
      r.count = Math.max(0, Math.round(Number(count) || 0));
      r.time = null;
    }
  }

  /** "Klaar" tijdens roeien of hardlopen: gehaald, met vastgelegde tijd. */
  function markKlaar(session, ex, seconds) {
    var r = session.results[ex];
    if (!r) return;
    r.done = true;
    r.r = 'pass';
    r.count = null;
    r.time = round1(seconds);
  }

  function maxCount(session, ex) {
    var meta = N.EX[ex];
    var norm = session.norms[ex];
    return meta.type === 'reps' ? Math.max(0, norm - 1) : meta.distance - 1;
  }

  function normText(ex, norm) {
    var meta = N.EX[ex];
    if (meta.type === 'reps') return norm + ' herhalingen';
    if (norm == null) return 'zo snel mogelijk (' + meta.short + ')';
    return N.clock(norm) + ' (' + meta.short + ')';
  }

  /** state: pass | fail | pending (nog niet beantwoord) | notdone (niet uitgevoerd) */
  function describe(session, ex) {
    var r = session.results[ex];
    var meta = N.EX[ex];
    var norm = session.norms[ex];
    if (!r || !r.done) return { state: 'notdone', text: 'Niet uitgevoerd' };
    if (r.r === 'pass') {
      return { state: 'pass', text: 'Gehaald' + (r.time ? ' · ' + N.clockUp(r.time) : '') };
    }
    if (r.r === 'fail') {
      var text = meta.type === 'reps'
        ? r.count + ' van ' + norm
        : r.count + ' van ' + meta.distance + ' m';
      return { state: 'fail', text: text };
    }
    return { state: 'pending', text: 'Nog invullen' };
  }

  function summary(session) {
    var s = { total: session.order.length, pass: 0, fail: 0, pending: 0, notdone: 0 };
    session.order.forEach(function (ex) { s[describe(session, ex).state]++; });
    return s;
  }

  function hasData(session) {
    return session.order.some(function (ex) { return session.results[ex].done; });
  }

  function pending(session) {
    return session.order.filter(function (ex) { return describe(session, ex).state === 'pending'; });
  }

  /**
   * Waarde voor de grafiek, of null als er (nog) niets te tonen is.
   * kind 'pct': percentage van de norm (100 = norm gehaald). kind 'time': seconden (roeien vanaf 55 jaar).
   */
  function value(session, ex) {
    var r = session.results[ex];
    var meta = N.EX[ex];
    var norm = session.norms[ex];
    if (!r || !r.done || r.r == null) return null;

    if (meta.type === 'reps') {
      if (r.r === 'pass') return { v: 100, kind: 'pct', pass: true, text: 'norm gehaald (' + norm + ')' };
      return { v: Math.round(r.count / norm * 100), kind: 'pct', pass: false, text: r.count + ' van ' + norm };
    }
    if (norm == null) {
      return r.time ? { v: r.time, kind: 'time', pass: true, text: N.clockUp(r.time) } : null;
    }
    if (r.r === 'pass') {
      if (r.time) {
        return { v: round1(norm / r.time * 100), kind: 'pct', pass: true, text: N.clockUp(r.time) };
      }
      return { v: 100, kind: 'pct', pass: true, text: 'norm gehaald' };
    }
    return {
      v: Math.round(r.count / meta.distance * 100), kind: 'pct', pass: false,
      text: r.count + ' van ' + meta.distance + ' m'
    };
  }

  return {
    newSession: newSession, answer: answer, markKlaar: markKlaar, maxCount: maxCount,
    normText: normText, describe: describe, summary: summary, hasData: hasData,
    pending: pending, value: value
  };
});
