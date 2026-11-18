/* Tests voor de webversie (iPhone): herinneringen, agenda-bestand en volledigheid van de offline-opslag.
 * Draai: node tests/web-tests.js */
'use strict';
process.env.TZ = 'Europe/Amsterdam';   // voor de herinneringen telt de tijd op het apparaat
var fs = require('fs');
var path = require('path');
var www = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'www');
var RM = require(path.join(www, 'js', 'reminders.js'));

var checks = 0, failures = 0;
function eq(name, actual, expected) {
  checks++;
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { failures++; console.log('FOUT ' + name + ': verwacht ' + e + ' maar kreeg ' + a); }
}
function ok(name, cond) { checks++; if (!cond) { failures++; console.log('FOUT ' + name); } }
function at(y, m, d, h, min) { return new Date(y, m - 1, d, h, min, 0, 0).getTime(); }
function rem(o) { return Object.assign({ enabled: true, mode: 'weekdays', days: [1, 3, 5], interval: 2, anchor: '2026-10-31', hour: 18, minute: 0 }, o || {}); }

// ---------------- volgende herinnering (zelfde gevallen als ReminderMathTest.java) ----------------
var now = at(2026, 10, 31, 0, 51);   // zaterdag
eq('weekdagen ma/wo/vr', RM.nextTrigger(rem(), now), at(2026, 11, 2, 18, 0));
eq('vandaag nog te komen', RM.nextTrigger(rem({ days: [6] }), now), at(2026, 10, 31, 18, 0));
eq('vandaag al voorbij', RM.nextTrigger(rem({ days: [6] }), at(2026, 10, 31, 19, 0)), at(2026, 11, 7, 18, 0));
eq('strikt na peiltijd', RM.nextTrigger(rem({ days: [6] }), at(2026, 10, 31, 18, 0)), at(2026, 11, 7, 18, 0));
eq('wintertijd (zondag 25 okt)', RM.nextTrigger(rem({ days: [7], hour: 8 }), at(2026, 10, 24, 21, 0)), at(2026, 10, 25, 8, 0));
eq('geen dagen', RM.nextTrigger(rem({ days: [] }), now), -1);
eq('uit', RM.nextTrigger(rem({ enabled: false }), now), -1);
eq('interval 2, vandaag', RM.nextTrigger(rem({ mode: 'interval', interval: 2 }), now), at(2026, 10, 31, 18, 0));
eq('interval 2, vandaag voorbij', RM.nextTrigger(rem({ mode: 'interval', interval: 2 }), at(2026, 10, 31, 19, 0)), at(2026, 11, 2, 18, 0));
eq('interval 3, anchor in de toekomst', RM.nextTrigger(rem({ mode: 'interval', interval: 3, anchor: '2026-11-10' }), now), at(2026, 11, 10, 18, 0));
eq('interval 3, anchor in het verleden', RM.nextTrigger(rem({ mode: 'interval', interval: 3, anchor: '2026-10-20' }), now), at(2026, 11, 1, 18, 0));
eq('interval 7', RM.nextTrigger(rem({ mode: 'interval', interval: 7, anchor: '2026-10-28' }), now), at(2026, 11, 4, 18, 0));
eq('interval 1', RM.nextTrigger(rem({ mode: 'interval', interval: 1 }), at(2026, 10, 31, 19, 0)), at(2026, 11, 1, 18, 0));
eq('interval over wintertijd heen', RM.nextTrigger(rem({ mode: 'interval', interval: 2, anchor: '2026-10-23', hour: 7 }), at(2026, 10, 24, 12, 0)), at(2026, 10, 25, 7, 0));
eq('ongeldige anchor', RM.nextTrigger(rem({ mode: 'interval', anchor: 'kapot' }), now), -1);

// ---------------- vandaag een training? ----------------
eq('vandaag (zaterdag) bij ma/wo/vr', RM.dueToday(rem(), now), false);
eq('maandag bij ma/wo/vr', RM.dueToday(rem(), at(2026, 11, 2, 9, 0)), true);
eq('uit = nooit', RM.dueToday(rem({ enabled: false }), at(2026, 11, 2, 9, 0)), false);
eq('interval: op de dag zelf', RM.dueToday(rem({ mode: 'interval', interval: 3, anchor: '2026-10-31' }), at(2026, 11, 3, 9, 0)), true);
eq('interval: een dag ernaast', RM.dueToday(rem({ mode: 'interval', interval: 3, anchor: '2026-10-31' }), at(2026, 11, 2, 9, 0)), false);
eq('interval: voor de eerste dag', RM.dueToday(rem({ mode: 'interval', interval: 3, anchor: '2026-11-10' }), at(2026, 11, 7, 9, 0)), false);

// ---------------- agenda-bestand ----------------
var ics = RM.ics(rem(), now);
ok('ics: begint en eindigt goed', /^BEGIN:VCALENDAR\r\n/.test(ics) && /END:VCALENDAR\r\n$/.test(ics));
ok('ics: regels eindigen op CRLF', ics.split('\n').every(function (l, i, a) { return i === a.length - 1 || /\r$/.test(l); }));
ok('ics: weekdagen', ics.indexOf('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\r\n') >= 0);
ok('ics: starttijd lokaal (eerste maandag 18:00)', ics.indexOf('DTSTART:20261102T180000\r\n') >= 0);
ok('ics: melding op het tijdstip zelf', ics.indexOf('BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Profit: tijd om te oefenen\r\nTRIGGER:PT0S\r\nEND:VALARM') >= 0);
ok('ics: een afspraak', (ics.match(/BEGIN:VEVENT/g) || []).length === 1 && (ics.match(/END:VEVENT/g) || []).length === 1);
ok('ics: DTSTAMP in UTC', /DTSTAMP:\d{8}T\d{6}Z\r\n/.test(ics));
ok('ics: geen regel langer dan 75 tekens', ics.split('\r\n').every(function (l) { return l.length <= 75; }));
var order = RM.ics(rem({ days: [5, 1, 3] }), now);
ok('ics: dagen op volgorde', order.indexOf('BYDAY=MO,WE,FR') >= 0);
var sun = RM.ics(rem({ days: [7, 6] }), now);
ok('ics: zaterdag en zondag', sun.indexOf('BYDAY=SA,SU') >= 0 && sun.indexOf('DTSTART:20261031T180000') >= 0);
var iv = RM.ics(rem({ mode: 'interval', interval: 3, anchor: '2026-11-10', hour: 7, minute: 5 }), now);
ok('ics: om de 3 dagen', iv.indexOf('RRULE:FREQ=DAILY;INTERVAL=3\r\n') >= 0);
ok('ics: interval begint op de eerste trainingsdag', iv.indexOf('DTSTART:20261110T070500\r\n') >= 0);
eq('ics: niets te plannen', RM.ics(rem({ days: [] }), now), null);
eq('ics: uit', RM.ics(rem({ enabled: false }), now), null);
ok('ics: andere tijd geeft andere UID', RM.ics(rem({ hour: 9 }), now).match(/UID:(.*)\r/)[1] !== RM.ics(rem({ hour: 10 }), now).match(/UID:(.*)\r/)[1]);

// ---------------- offline-opslag en webapp-bestanden ----------------
function listFiles(dir, base) {
  var out = [];
  fs.readdirSync(dir).forEach(function (f) {
    var full = path.join(dir, f), rel = base ? base + '/' + f : f;
    if (fs.statSync(full).isDirectory()) out = out.concat(listFiles(full, rel)); else out.push(rel);
  });
  return out;
}
var sw = fs.readFileSync(path.join(www, 'sw.js'), 'utf8');
var listed = /var FILES = \[([\s\S]*?)\];/.exec(sw)[1].match(/'([^']+)'/g).map(function (x) { return x.slice(1, -1); });
var onDisk = listFiles(www).filter(function (f) { return f !== 'sw.js'; });
onDisk.forEach(function (f) { ok('sw.js bewaart ' + f, listed.indexOf(f) >= 0); });
listed.forEach(function (f) { if (f !== './') ok('sw.js noemt een bestaand bestand: ' + f, fs.existsSync(path.join(www, f))); });
ok('sw.js heeft een VERSION die het publiceren kan vervangen', /var VERSION = 'dev';/.test(sw));

var manifest = JSON.parse(fs.readFileSync(path.join(www, 'manifest.webmanifest'), 'utf8'));
eq('manifest: naam', manifest.short_name, 'Profit');
eq('manifest: standalone', manifest.display, 'standalone');
eq('manifest: start in de eigen map', manifest.start_url, './');
manifest.icons.forEach(function (i) {
  ok('manifest-icoon bestaat: ' + i.src, fs.existsSync(path.join(www, i.src)));
  var buf = fs.readFileSync(path.join(www, i.src));
  var w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  eq('manifest-icoon ' + i.src + ' heeft de opgegeven maat', w + 'x' + h, i.sizes);
});
var apple = fs.readFileSync(path.join(www, 'icons', 'apple-touch-icon.png'));
eq('apple-touch-icon is 180x180', apple.readUInt32BE(16) + 'x' + apple.readUInt32BE(20), '180x180');

var html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
(html.match(/(?:src|href)="([^"#]+)"/g) || []).forEach(function (m) {
  var f = /"([^"]+)"/.exec(m)[1];
  if (/^(https?:|data:)/.test(f)) return;
  ok('index.html verwijst naar een bestaand bestand: ' + f, fs.existsSync(path.join(www, f)));
});
ok('index.html: geen externe bronnen (alles werkt offline)', !/(?:src|href)="https?:/.test(html));
ok('index.html: beginscherm-app voor iOS', /apple-mobile-web-app-capable" content="yes"/.test(html));
ok('index.html: apple-touch-icon', /rel="apple-touch-icon" href="icons\/apple-touch-icon.png"/.test(html));
ok('index.html: viewport-fit=cover (veilige randen)', /viewport-fit=cover/.test(html));
// de scripts staan in de goede volgorde: app.js als laatste
var scripts = (html.match(/<script src="([^"]+)"/g) || []).map(function (x) { return /"([^"]+)"/.exec(x)[1]; });
eq('laatste script is app.js', scripts[scripts.length - 1], 'js/app.js');
ok('web.js en reminders.js staan voor app.js', scripts.indexOf('js/web.js') < scripts.indexOf('js/app.js') && scripts.indexOf('js/reminders.js') < scripts.indexOf('js/app.js'));

console.log(failures === 0 ? 'Web-tests OK (' + checks + ' controles)' : failures + ' van ' + checks + ' controles mislukt');
process.exit(failures === 0 ? 0 : 1);
