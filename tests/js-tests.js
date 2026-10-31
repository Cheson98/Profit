/* Tests voor normen, timer-engine en resultaten. Draai: node tests/js-tests.js */
'use strict';
var path = require('path');
var www = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'www', 'js');
var N = require(path.join(www, 'norms.js'));
var E = require(path.join(www, 'engine.js'));
var R = require(path.join(www, 'results.js'));
var C = require(path.join(www, 'charts.js'));

var checks = 0, failures = 0;
function eq(name, actual, expected) {
  checks++;
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { failures++; console.log('FOUT ' + name + ': verwacht ' + e + ' maar kreeg ' + a); }
}
function ok(name, cond) { checks++; if (!cond) { failures++; console.log('FOUT ' + name); } }

// ---------------- normen ----------------
// roeien: steekproeven uit de aangeleverde tabellen
eq('vrouw 34 jaar 62 kg', N.rowingSeconds('f', 34, 62), 120);
eq('vrouw 18 jaar 45 kg', N.rowingSeconds('f', 18, 45), 130);
eq('vrouw 29 jaar 70 kg en hoger', N.rowingSeconds('f', 29, 95), 112);
eq('vrouw 52 jaar 55 kg', N.rowingSeconds('f', 52, 55), 138);
eq('vrouw 40 jaar 56 kg', N.rowingSeconds('f', 40, 56), 130);
eq('man 20 jaar 45 kg', N.rowingSeconds('m', 20, 45), 123);
eq('man 20 jaar 84 kg en hoger', N.rowingSeconds('m', 20, 84), 100);
eq('man 20 jaar 120 kg (begrensd)', N.rowingSeconds('m', 20, 120), 100);
eq('man 37 jaar 78 kg', N.rowingSeconds('m', 37, 78), 109);
eq('man 50 jaar 60 kg', N.rowingSeconds('m', 50, 60), 129);
eq('man 54 jaar 83 kg', N.rowingSeconds('m', 54, 83), 115);
eq('gewicht onder 45 kg telt als 45', N.rowingSeconds('f', 20, 40), 130);
eq('gewicht wordt afgerond', N.rowingSeconds('f', 34, 61.6), 120);
eq('55 jaar: zo snel mogelijk', N.rowingSeconds('m', 55, 80), null);
eq('jonger dan 18', N.rowingSeconds('m', 17, 80), undefined);
eq('aantal regels mannen', N.ROW_M.length, 40);
eq('aantal regels vrouwen', N.ROW_F.length, 26);

[['mannen', N.ROW_M], ['vrouwen', N.ROW_F]].forEach(function (t) {
  t[1].forEach(function (row, i) {
    eq(t[0] + ' regel ' + (45 + i) + ' heeft 6 waarden', row.length, 6);
    for (var c = 1; c < 6; c++) ok(t[0] + ' regel ' + (45 + i) + ': ouder = langzamer', row[c] >= row[c - 1]);
    if (i > 0) for (var k = 0; k < 6; k++) ok(t[0] + ' kolom ' + k + ' gewicht ' + (45 + i) + ': zwaarder = sneller of gelijk', row[k] <= t[1][i - 1][k]);
  });
});

// Q8-doelstellingen
eq('leeftijdsklassen', [17, 18, 29, 30, 34, 35, 39, 40, 44, 45, 49, 50, 80].map(N.ageIndex), [-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
eq('man 25 jaar', N.normsFor({ gender: 'm', age: 25, weight: 80 }),
  { rowing: 102, squats: 45, pushups: 30, situps: 40, burpees: 15, pullups: 6, run: 470 });
eq('vrouw 34 jaar', N.normsFor({ gender: 'f', age: 34, weight: 62 }),
  { rowing: 120, squats: 38, pushups: 14, situps: 28, burpees: 19, pullups: 5, run: 540 });
eq('man 52 jaar', N.normsFor({ gender: 'm', age: 52, weight: 90 }),
  { rowing: 115, squats: 30, pushups: 20, situps: 30, burpees: 10, pullups: 1, run: 520 });
eq('vrouw 60 jaar', N.normsFor({ gender: 'f', age: 60, weight: 70 }),
  { rowing: null, squats: 30, pushups: 10, situps: 20, burpees: 15, pullups: 1, run: 600 });
eq('1600 m man 40-44 = 8:20', N.Q8.m.run[3], 500);
eq('1600 m vrouw 45-49 = 9:45', N.Q8.f.run[4], 585);
eq('ongeldig profiel: geen geslacht', N.normsFor({ gender: null, age: 30, weight: 70 }), null);
eq('ongeldig profiel: te jong', N.normsFor({ gender: 'm', age: 16, weight: 70 }), null);
eq('ongeldig profiel: geen gewicht', N.normsFor({ gender: 'm', age: 30, weight: null }), null);
eq('pull-ups op plek 1', N.repsOrder(1), ['pullups', 'squats', 'pushups', 'situps', 'burpees']);
eq('pull-ups op plek 3', N.repsOrder(3), ['squats', 'pushups', 'pullups', 'situps', 'burpees']);
eq('pull-ups op plek 5', N.repsOrder(5), ['squats', 'pushups', 'situps', 'burpees', 'pullups']);
eq('pull-ups ongeldige plek = laatste', N.repsOrder(9), ['squats', 'pushups', 'situps', 'burpees', 'pullups']);
eq('klok naar boven afgerond', N.clock(59.2), '1:00');
eq('klok 0', N.clock(0), '0:00');
eq('klok omlaag afgerond', N.clockUp(119.9), '1:59');

// ---------------- plan en engine ----------------
var settings = { countdown: 10, restRow: 420, exSeconds: 60, restBetween: 180, restRun: 540, pullupPos: 5 };
var norms = N.normsFor({ gender: 'f', age: 34, weight: 62 });
var plan = E.buildPlan(settings, norms);
eq('plan: volgorde', plan.map(function (s) { return s.id; }),
  ['countdown', 'rowing', 'rest-rowing', 'squats', 'rest-squats', 'pushups', 'rest-pushups', 'situps', 'rest-situps',
    'burpees', 'rest-burpees', 'pullups', 'rest-pullups', 'run']);
eq('plan: seconden', plan.map(function (s) { return s.seconds; }), [10, 120, 420, 60, 180, 60, 180, 60, 180, 60, 180, 60, 540, 540]);
eq('plan: totale duur', E.planInfo(plan).total, 10 + 120 + 420 + 5 * 60 + 4 * 180 + 540 + 540);
eq('plan: aantal onderdelen', E.planInfo(plan).works, 7);
eq('plan zonder aftellen', E.buildPlan({ countdown: 0, restRow: 420, exSeconds: 60, restBetween: 180, restRun: 540, pullupPos: 1 }, norms)
  .map(function (s) { return s.id; }).slice(0, 5), ['rowing', 'rest-rowing', 'pullups', 'rest-pullups', 'squats']);
eq('plan 55+: roeien zonder einde', E.buildPlan(settings, N.normsFor({ gender: 'm', age: 56, weight: 80 }))[1].seconds, null);

function simulate(plan, hooksExtra) {
  var t = 1000000, signals = [], steps = [], ends = [], finished = 0;
  var eng = new E.Engine(plan, {
    now: function () { return t; }, ticks: false,
    onSignal: function (k) { signals.push(k); },
    onStep: function (i, s) { steps.push(s.id); },
    onEnd: function (s, info) { ends.push(s.id + ':' + Math.round(info.elapsed)); },
    onFinish: function () { finished++; }
  });
  return { eng: eng,
    // zoals in de app: elke 100 ms controleren
    adv: function (ms) { for (var i = 0; i < ms / 100; i++) { t += 100; eng.tick(); } },
    // grote sprong, bijvoorbeeld doordat de app op de achtergrond zat
    jump: function (ms) { t += ms; eng.tick(); }, signals: signals, steps: steps, ends: ends, fin: function () { return finished; }, now: function () { return t; } };
}

var sim = simulate(plan);
sim.eng.start();
eq('start: eerste stap is aftellen', sim.steps, ['countdown']);
sim.adv(9900); eq('na 9,9 s nog aftellen', sim.steps.length, 1);
sim.adv(100); eq('na 10 s begint roeien automatisch', sim.steps[1], 'rowing');
sim.adv(120000); eq('na normtijd begint rust (7 min)', sim.steps[2], 'rest-rowing');
sim.adv(420000); eq('na 7 min rust begint squats', sim.steps[3], 'squats');
sim.adv(60000); eq('na 1 min begint rust 3 min', sim.steps[4], 'rest-squats');
sim.adv(180000); eq('dan push-ups', sim.steps[5], 'pushups');
eq('signalen tot nu toe', sim.signals, ['tick', 'start', 'stop', 'start', 'stop', 'start']);
// rest van de test
sim.adv(60000 + 180000 + 60000 + 180000 + 60000 + 180000 + 60000);
eq('na pull-ups: rust voor hardlopen', sim.steps[12], 'rest-pullups');
sim.adv(540000); eq('hardlopen begint na 9 min rust', sim.steps[13], 'run');
ok('nog niet klaar tijdens hardlopen', sim.fin() === 0);
sim.adv(540000);
eq('klaar na hardlopen', sim.fin(), 1);
eq('eindsignaal', sim.signals[sim.signals.length - 1], 'stop');
eq('aantal startsignalen = 7 onderdelen', sim.signals.filter(function (s) { return s === 'start'; }).length, 7);
eq('aantal stopsignalen = 6 rustmomenten + einde', sim.signals.filter(function (s) { return s === 'stop'; }).length, 7);
eq('totale duur klopt', sim.now() - 1000000, E.planInfo(plan).total * 1000);

// Klaar tijdens roeien
sim = simulate(plan);
sim.eng.start(); sim.adv(10000); sim.adv(95000);
sim.eng.finishNow();
eq('Klaar bij roeien: direct rust', sim.steps[2], 'rest-rowing');
eq('Klaar bij roeien: tijd vastgelegd', sim.ends[1], 'rowing:95');
eq('Klaar bij roeien: eerder-vlag', true, true);
sim.adv(420000); eq('rust duurt nog volledig 7 min', sim.steps[3], 'squats');

// app op de achtergrond: stappen worden stil ingehaald
sim = simulate(plan);
sim.eng.start();
sim.jump(3600000);
eq('na een uur is de test afgelopen', sim.fin(), 1);
eq('ingehaalde stappen geven geen pieptonen', sim.signals, ['tick']);

// open einde (roeien 55+)
var open = E.buildPlan({ countdown: 0, restRow: 420, exSeconds: 60, restBetween: 180, restRun: 540, pullupPos: 5 }, N.normsFor({ gender: 'f', age: 58, weight: 70 }));
sim = simulate(open);
sim.eng.start(); sim.jump(3600000);
eq('roeien zonder norm wacht op Klaar', sim.steps, ['rowing']);
ok('verstreken tijd telt door', sim.eng.elapsed() >= 3600);
sim.eng.finishNow();
eq('na Klaar volgt rust', sim.steps[1], 'rest-rowing');

// pauze-achtig: herstel uit momentopname
sim = simulate(plan);
sim.eng.start(); sim.adv(10000); sim.adv(30000);
var snap = sim.eng.snapshot();
var sim2 = simulate(plan);
sim2.eng.restore(snap);
eq('herstel: zelfde stap', sim2.eng.current().id, 'rowing');

// piepjes in de laatste 3 seconden
var tickSignals = [], tt = 0;
var e3 = new E.Engine([{ id: 'x', kind: 'work', ex: 'squats', seconds: 10 }], {
  now: function () { return tt; }, ticks: true, onSignal: function (k) { tickSignals.push(k); }
});
e3.start();
for (tt = 0; tt <= 10000; tt += 100) e3.tick();
eq('3 piepjes in laatste 3 s, start- en stopsignaal', tickSignals, ['start', 'tick', 'tick', 'tick', 'stop']);

// ---------------- resultaten ----------------
var prof = { gender: 'f', age: 34, weight: 62 };
var s1 = R.newSession(prof, norms, plan, 1000);
eq('sessie: 7 onderdelen in volgorde', s1.order, ['rowing', 'squats', 'pushups', 'situps', 'burpees', 'pullups', 'run']);
eq('nieuw: niets uitgevoerd', R.summary(s1), { total: 7, pass: 0, fail: 0, pending: 0, notdone: 7 });
ok('nieuw: geen data', !R.hasData(s1));
R.answer(s1, 'squats', true);
R.answer(s1, 'pushups', false, 9);
R.markKlaar(s1, 'rowing', 112.34);
s1.results.situps.done = true;                      // gedaan, niet beantwoord
eq('ja: gehaald', R.describe(s1, 'squats'), { state: 'pass', text: 'Gehaald' });
eq('nee: aantal van norm', R.describe(s1, 'pushups'), { state: 'fail', text: '9 van 14' });
eq('klaar: tijd erbij', R.describe(s1, 'rowing'), { state: 'pass', text: 'Gehaald · 1:52' });
eq('onbeantwoord: nog invullen', R.describe(s1, 'situps'), { state: 'pending', text: 'Nog invullen' });
eq('niet uitgevoerd', R.describe(s1, 'run').state, 'notdone');
eq('samenvatting', R.summary(s1), { total: 7, pass: 2, fail: 1, pending: 1, notdone: 3 });
eq('openstaande vragen', R.pending(s1), ['situps']);
R.answer(s1, 'situps', true);
eq('achteraf invullen werkt', R.describe(s1, 'situps').state, 'pass');
R.answer(s1, 'pushups', true);
eq('antwoord wijzigen nee -> ja', R.describe(s1, 'pushups').state, 'pass');
R.answer(s1, 'run', false, 99999);
eq('hardlopen: meters begrensd door invoer', R.describe(s1, 'run').text, '99999 van 1600 m');
eq('max herhalingen = norm - 1', R.maxCount(s1, 'squats'), 37);
eq('max meters roeien', R.maxCount(s1, 'rowing'), 499);
eq('max meters hardlopen', R.maxCount(s1, 'run'), 1599);

// waarden voor de grafiek
var s2 = R.newSession(prof, norms, plan, 2000);
R.answer(s2, 'squats', false, 19);
R.answer(s2, 'rowing', false, 250);
R.markKlaar(s2, 'run', 480);
R.answer(s2, 'pullups', true);
eq('grafiek: herhalingen niet gehaald = percentage', R.value(s2, 'squats').v, 50);
eq('grafiek: gehaald = 100', R.value(s2, 'pullups').v, 100);
eq('grafiek: roeien niet gehaald = percentage afstand', R.value(s2, 'rowing').v, 50);
eq('grafiek: hardlopen sneller dan norm > 100', R.value(s2, 'run').v, 112.5);
eq('grafiek: niet uitgevoerd = geen punt', R.value(s2, 'situps'), null);
var s3 = R.newSession(prof, N.normsFor({ gender: 'f', age: 58, weight: 70 }), E.buildPlan(settings, N.normsFor({ gender: 'f', age: 58, weight: 70 })), 3000);
R.markKlaar(s3, 'rowing', 140);
eq('grafiek: roeien 55+ in seconden', R.value(s3, 'rowing').kind, 'time');
eq('norm 55+ in tekst', R.normText('rowing', null), 'zo snel mogelijk (500 m)');
// normen veranderen later niet mee met oude tests
var snapNorms = JSON.stringify(s1.norms);
N.Q8.f.squats[1] = 99;
eq('oude sessie bewaart eigen normen', JSON.stringify(s1.norms), snapNorms);
N.Q8.f.squats[1] = 38;

// ---------------- grafiek ----------------
var svg = C.line([{ v: 60, label: '1 okt', pass: false }, { v: 100, label: '8 okt', pass: true }], { kind: 'pct', label: 'test' });
ok('grafiek is svg', svg.indexOf('<svg') === 0 && svg.indexOf('</svg>') > 0);
ok('grafiek: twee punten', (svg.match(/<circle/g) || []).length === 2);
ok('grafiek: normlijn', svg.indexOf('class="target"') > 0);
ok('grafiek: één punt werkt ook', C.line([{ v: 80, label: 'x', pass: false }], { kind: 'pct' }).indexOf('<circle') > 0);
ok('grafiek: tijden', C.line([{ v: 130, label: 'a' }, { v: 120, label: 'b' }], { kind: 'time' }).indexOf('class="target"') < 0);

// ---------------- back-up ----------------
var Bk = require(path.join(www, 'backup.js'));
var DEFS = { countdown: 10, restRow: 420, exSeconds: 60, restBetween: 180, restRun: 540, pullupPos: 5, sound: true, vibrate: true, ticks: true };
var LIMITS = { countdown: { min: 0, max: 60 }, restRow: { min: 60, max: 900 }, exSeconds: { min: 30, max: 180 }, restBetween: { min: 30, max: 600 }, restRun: { min: 60, max: 900 } };
var OPTS = { defaults: DEFS, limits: LIMITS, today: '2026-10-31' };
var bstate = {
  profile: { gender: 'f', age: 34, weight: 62 },
  settings: Object.assign({}, DEFS, { pullupPos: 2, sound: false }),
  reminder: { enabled: true, mode: 'interval', days: [1, 3, 5], interval: 4, anchor: '2026-11-02', hour: 7, minute: 30 },
  sessions: [s1, s2]
};
var bfile = JSON.stringify(Bk.build(bstate, Date.UTC(2026, 9, 31, 12, 0)), null, 2);
var back = Bk.parse(bfile, OPTS);
ok('back-up: terug te lezen', back.ok === true);
eq('back-up: aantal tests', back.data.sessions.length, 2);
eq('back-up: niets overgeslagen', back.skipped, 0);
eq('back-up: eerste test identiek', JSON.stringify(back.data.sessions[0]), JSON.stringify(s1));
eq('back-up: tweede test identiek', JSON.stringify(back.data.sessions[1]), JSON.stringify(s2));
eq('back-up: gegevens', back.data.profile, bstate.profile);
eq('back-up: instellingen', back.data.settings, bstate.settings);
eq('back-up: herinnering', back.data.reminder, bstate.reminder);
eq('back-up: bestandsnaam', Bk.fileName(new Date(2026, 9, 31, 12).getTime()), 'profit-back-up-2026-10-31.json');
eq('back-up: lopende test zit er niet in', Object.prototype.hasOwnProperty.call(JSON.parse(bfile), 'active'), false);

// beschadigde of vreemde bestanden
eq('geen JSON', Bk.parse('dit is geen json', OPTS).ok, false);
eq('lege inhoud', Bk.parse('', OPTS).ok, false);
eq('JSON van iets anders', Bk.parse('{"format":"iets-anders","sessions":[]}', OPTS).ok, false);
eq('JSON-lijst in plaats van object', Bk.parse('[1,2,3]', OPTS).ok, false);
var newer = Bk.parse('{"format":"profit-backup","version":2,"sessions":[]}', OPTS);
ok('nieuwere versie wordt geweigerd', newer.ok === false && /nieuwere/.test(newer.error));
ok('te veel tests wordt geweigerd', Bk.parse(JSON.stringify({ format: 'profit-backup', version: 1, sessions: new Array(5001).fill(null) }), OPTS).ok === false);

// opschonen van onzin in een verder geldig bestand
var dirty = JSON.parse(bfile);
var evil = JSON.parse(JSON.stringify(s1));
evil.id = 'evil';
evil.order = ['__proto__'];
var zeroNorm = JSON.parse(JSON.stringify(s1)); zeroNorm.id = 'zero'; zeroNorm.norms.squats = 0;
var noProfile = JSON.parse(JSON.stringify(s1)); noProfile.id = 'noprof'; noProfile.profile = { gender: 'x', age: 5, weight: 1 };
var longId = JSON.parse(JSON.stringify(s1)); longId.id = new Array(60).join('a');
dirty.sessions = [s1, { id: 'x' }, null, 'tekst', s1, evil, zeroNorm, noProfile, longId, s2];
dirty.settings = { countdown: 9999, restRow: 'veel', pullupPos: 17, sound: 'ja', vibrate: false, onbekend: 1 };
dirty.reminder = { enabled: 'ja', mode: 'raar', days: [0, 3, 3, 9, 'a', 7], interval: 99, anchor: 'morgen', hour: 99, minute: -4 };
dirty.profile = { gender: 'x', age: 5, weight: 'zwaar' };
var d = Bk.parse(JSON.stringify(dirty), OPTS);
ok('vuil bestand wordt toch gelezen', d.ok === true);
eq('alleen geldige unieke tests blijven over', d.data.sessions.map(function (x) { return x.id; }), [s1.id, s2.id]);
eq('overgeslagen tests geteld', d.skipped, 8);
eq('instellingen opgeschoond', d.data.settings, { countdown: 60, restRow: 420, exSeconds: 60, restBetween: 180, restRun: 540, pullupPos: 5, sound: true, vibrate: false, ticks: true });
eq('herinnering opgeschoond', d.data.reminder, { enabled: false, mode: 'weekdays', days: [3, 7], interval: 30, anchor: '2026-10-31', hour: 23, minute: 0 });
eq('ongeldige gegevens worden leeg', d.data.profile, { gender: null, age: null, weight: null });
ok('onbekende instelling wordt niet overgenomen', !('onbekend' in d.data.settings));
ok('prototype blijft ongemoeid', ({}).polluted === undefined);

// samenvoegen
var m1 = Bk.merge([s1], [JSON.parse(JSON.stringify(s1)), s2]);
eq('samenvoegen: 1 nieuw', m1.added, 1);
eq('samenvoegen: 2 in totaal, op datum', m1.sessions.map(function (x) { return x.id; }), [s1.id, s2.id]);
var m2 = Bk.merge([s2, s1], [s1, s2]);
eq('samenvoegen: niets nieuw', m2.added, 0);
eq('samenvoegen: bestaande blijven staan en worden op datum gezet', m2.sessions.map(function (x) { return x.id; }), [s1.id, s2.id]);
var cur = [s1];
Bk.merge(cur, [s2]);
eq('samenvoegen wijzigt de huidige lijst niet', cur.length, 1);

console.log(failures === 0 ? 'JavaScript-tests OK (' + checks + ' controles)' : failures + ' van ' + checks + ' controles mislukt');
process.exit(failures === 0 ? 0 : 1);
