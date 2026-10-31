/* Testverloop: opbouw van het schema en de timer-engine.
 * De engine werkt met absolute tijdstippen, zodat hij ook klopt als de app even op de achtergrond zat. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./norms'));
  else root.Q8Engine = factory(root.Q8Norms);
})(typeof self !== 'undefined' ? self : this, function (N) {
  'use strict';

  /**
   * Schema: aftellen -> roeien -> rust -> 5 onderdelen (elk met rust) -> hardlopen.
   * seconds === null betekent: open einde (roeien vanaf 55 jaar: zo snel mogelijk, afsluiten met "Klaar").
   */
  function buildPlan(settings, norms) {
    var s = settings, steps = [];
    if (s.countdown > 0) {
      steps.push({ id: 'countdown', kind: 'countdown', seconds: Math.round(s.countdown) });
    }
    steps.push({ id: 'rowing', kind: 'work', ex: 'rowing', seconds: norms.rowing == null ? null : norms.rowing });
    steps.push({ id: 'rest-rowing', kind: 'rest', seconds: Math.round(s.restRow) });
    var order = N.repsOrder(s.pullupPos);
    order.forEach(function (ex, i) {
      steps.push({ id: ex, kind: 'work', ex: ex, seconds: Math.round(s.exSeconds) });
      var last = i === order.length - 1;
      steps.push({ id: 'rest-' + ex, kind: 'rest', seconds: Math.round(last ? s.restRun : s.restBetween) });
    });
    steps.push({ id: 'run', kind: 'work', ex: 'run', seconds: norms.run });
    return steps;
  }

  function planInfo(plan) {
    var total = 0, works = 0;
    plan.forEach(function (st) {
      if (st.seconds != null) total += st.seconds;
      if (st.kind === 'work') works++;
    });
    return { total: total, works: works };
  }

  /**
   * hooks: now(), ticks (bool), onSignal(kind), onStep(idx, step), onEnd(step, info), onFinish()
   * signalen: 'start' (begin onderdeel), 'stop' (einde onderdeel / begin rust), 'tick' (laatste 3 seconden, begin aftellen)
   */
  function Engine(plan, hooks) {
    this.plan = plan;
    this.h = hooks || {};
    this.now = this.h.now || Date.now;
    this.idx = -1;
    this.stepStart = 0;
    this.finished = false;
    this.tickDone = {};
  }

  Engine.prototype._emit = function (name, a, b) {
    var f = this.h[name];
    if (f) f(a, b);
  };

  Engine.prototype.start = function () {
    this.idx = 0;
    this.stepStart = this.now();
    this.finished = false;
    this._enter(true);
  };

  Engine.prototype._enter = function (loud) {
    var step = this.plan[this.idx];
    this.tickDone = {};
    if (loud) {
      this._emit('onSignal', step.kind === 'work' ? 'start' : step.kind === 'rest' ? 'stop' : 'tick');
    }
    this._emit('onStep', this.idx, step);
  };

  Engine.prototype._advance = function (boundary, loud, early) {
    var step = this.plan[this.idx];
    this._emit('onEnd', step, { elapsed: (boundary - this.stepStart) / 1000, early: !!early });
    this.idx++;
    this.stepStart = boundary;
    if (this.idx >= this.plan.length) {
      this.finished = true;
      if (loud) this._emit('onSignal', 'stop');
      this._emit('onFinish');
      return;
    }
    this._enter(loud);
  };

  Engine.prototype._ticks = function (step, remainingMs) {
    if (!this.h.ticks || step.seconds <= 4) return;
    var s = Math.ceil(remainingMs / 1000);
    if (s >= 1 && s <= 3 && !this.tickDone[s]) {
      this.tickDone[s] = true;
      this._emit('onSignal', 'tick');
    }
  };

  /** Aanroepen zo vaak mogelijk (bijv. elke 200 ms). Haalt ook gemiste stappen in. */
  Engine.prototype.tick = function () {
    var guard = 0;
    while (!this.finished && this.idx >= 0 && guard++ < 100) {
      var step = this.plan[this.idx];
      if (step.seconds == null) return; // open stap: wacht op "Klaar"
      var endAt = this.stepStart + step.seconds * 1000;
      var t = this.now();
      if (t < endAt) {
        this._ticks(step, endAt - t);
        return;
      }
      // te laat (app op de achtergrond): stap stil afsluiten, geen piep
      this._advance(endAt, (t - endAt) < 2000, false);
    }
  };

  /** Beëindigt de huidige stap nu (Klaar-knop of rust overslaan). */
  Engine.prototype.finishNow = function () {
    if (this.finished || this.idx < 0) return;
    this._advance(this.now(), true, true);
  };

  Engine.prototype.elapsed = function () {
    return (this.now() - this.stepStart) / 1000;
  };

  Engine.prototype.current = function () {
    return this.finished || this.idx < 0 ? null : this.plan[this.idx];
  };

  Engine.prototype.snapshot = function () {
    return { idx: this.idx, stepStart: this.stepStart, finished: this.finished };
  };

  Engine.prototype.restore = function (snap) {
    this.idx = snap.idx;
    this.stepStart = snap.stepStart;
    this.finished = !!snap.finished;
    this.tickDone = {};
  };

  return { buildPlan: buildPlan, planInfo: planInfo, Engine: Engine };
});
