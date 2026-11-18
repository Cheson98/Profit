/* Herinneringen voor de webversie (iPhone): het volgende moment berekenen en een agenda-bestand (.ics)
 * maken. Dezelfde regels als ReminderMath.java op Android. Tijden zijn de tijd op het apparaat. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Q8Reminders = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY_MS = 86400000;
  var ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // 'YYYY-MM-DD' naar een dag-nummer (zonder tijdzone, dus zonder zomertijd-gedoe)
  function isoToDay(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS);
  }
  function dayToParts(day) {
    var d = new Date(day * DAY_MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  }
  function localDay(date) { return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS); }
  function atLocal(day, hour, minute) {
    var p = dayToParts(day);
    return new Date(p.y, p.m - 1, p.d, hour, minute, 0, 0).getTime();
  }
  // 1 = maandag ... 7 = zondag
  function isoWeekday(day) { var w = new Date(day * DAY_MS).getUTCDay(); return w === 0 ? 7 : w; }

  function valid(rem) {
    if (!rem || !rem.enabled) return false;
    if (rem.mode === 'interval') return isoToDay(rem.anchor) != null && rem.interval >= 1;
    return Array.isArray(rem.days) && rem.days.length > 0;
  }

  // Valt deze dag op een trainingsdag?
  function matchesDay(rem, day) {
    if (!valid(rem)) return false;
    if (rem.mode === 'interval') {
      var diff = day - isoToDay(rem.anchor), n = Math.max(1, rem.interval);
      return diff >= 0 && diff % n === 0;
    }
    return rem.days.indexOf(isoWeekday(day)) >= 0;
  }

  // Eerste trainingsdag op of na 'fromDay' (maximaal een jaar vooruit), of null
  function firstDayFrom(rem, fromDay) {
    if (!valid(rem)) return null;
    if (rem.mode === 'interval') {
      var a = isoToDay(rem.anchor), n = Math.max(1, rem.interval);
      return fromDay <= a ? a : a + Math.ceil((fromDay - a) / n) * n;
    }
    for (var i = 0; i < 8; i++) if (matchesDay(rem, fromDay + i)) return fromDay + i;
    return null;
  }

  // Volgend moment (ms) strikt na nowMs, of -1
  function nextTrigger(rem, nowMs) {
    if (!valid(rem)) return -1;
    var today = localDay(new Date(nowMs));
    for (var i = 0; i < 3; i++) {
      var d = firstDayFrom(rem, today + (i === 0 ? 0 : 1));
      if (d == null) return -1;
      var t = atLocal(d, rem.hour, rem.minute);
      if (t > nowMs) return t;
      today = d;   // vandaag is al voorbij: zoek vanaf de dag erna
    }
    return -1;
  }

  // Staat er vandaag een training gepland?
  function dueToday(rem, nowMs) {
    return matchesDay(rem, localDay(new Date(nowMs)));
  }

  function stamp(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' +
      pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
  }
  function localStamp(ms) {
    var d = new Date(ms);
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + pad2(d.getMinutes()) + '00';
  }

  // Agenda-bestand met een terugkerende afspraak en een melding op het tijdstip zelf. Null als er niets te plannen valt.
  function ics(rem, nowMs) {
    var first = nextTrigger(rem, nowMs);
    if (first < 0) return null;
    var rule;
    if (rem.mode === 'interval') {
      rule = 'FREQ=DAILY;INTERVAL=' + Math.max(1, rem.interval);
    } else {
      var codes = rem.days.slice().sort(function (a, b) { return a - b; }).map(function (d) { return ICS_DAYS[d - 1]; });
      rule = 'FREQ=WEEKLY;BYDAY=' + codes.join(',');
    }
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Profit//Q8 oefenapp//NL',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:profit-oefenen-' + rule.replace(/[^A-Z0-9]/g, '').toLowerCase() + '-' + pad2(rem.hour) + pad2(rem.minute) + '@profit',
      'DTSTAMP:' + stamp(nowMs),
      'DTSTART:' + localStamp(first),
      'DURATION:PT45M',
      'RRULE:' + rule,
      'SUMMARY:Profit: Q8-training',
      'DESCRIPTION:Tijd om te oefenen. Open Profit en start de test.',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Profit: tijd om te oefenen',
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return lines.join('\r\n') + '\r\n';
  }

  return { nextTrigger: nextTrigger, dueToday: dueToday, matchesDay: matchesDay, ics: ics, localDay: localDay, isoToDay: isoToDay };
});
