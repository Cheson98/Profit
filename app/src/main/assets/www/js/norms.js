/* Normen voor de Q8-sporttest.
 * - Roeien: "geschaalde roeinormen" (seconden voor 500 m) per leeftijdsklasse en lichaamsgewicht.
 * - Overige onderdelen: "Doelstellingen Q8 Heren/Dames" per leeftijdsklasse.
 * Bron: de tabellen die de gebruiker heeft aangeleverd. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Q8Norms = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function rows(lines) {
    return lines.map(function (l) { return l.trim().split(/\s+/).map(Number); });
  }

  // Eén regel per lichaamsgewicht, beginnend bij 45 kg. Kolommen: 18-29, 30-34, 35-39, 40-44, 45-49, 50-54 jaar.
  // Mannen: laatste regel (84) geldt voor "84 en hoger". Vanaf 55 jaar: zo snel mogelijk (geen norm).
  var ROW_M = rows([
    '123 127 131 134 138 141', // 45
    '122 126 130 133 137 141', // 46
    '121 125 129 132 136 140', // 47
    '121 124 128 131 135 139', // 48
    '120 123 127 130 134 138', // 49
    '119 122 126 130 133 137', // 50
    '118 122 125 129 132 136', // 51
    '117 121 124 128 131 135', // 52
    '117 120 124 127 131 134', // 53
    '116 119 123 126 130 133', // 54
    '115 119 122 126 129 132', // 55
    '114 118 121 125 128 132', // 56
    '114 117 121 124 127 131', // 57
    '113 117 120 123 127 130', // 58
    '112 116 119 123 126 129', // 59
    '112 115 119 122 125 129', // 60
    '111 115 118 121 125 128', // 61
    '111 114 117 121 124 127', // 62
    '110 113 117 120 123 127', // 63
    '109 113 116 119 123 126', // 64
    '109 112 115 119 122 125', // 65
    '108 112 115 118 121 125', // 66
    '108 111 114 118 121 124', // 67
    '107 111 114 117 120 123', // 68
    '107 110 113 116 120 123', // 69
    '106 109 113 116 119 122', // 70
    '106 109 112 115 118 122', // 71
    '105 108 112 115 118 121', // 72
    '105 108 111 114 117 121', // 73
    '104 107 111 114 117 120', // 74
    '104 107 110 113 116 119', // 75
    '103 106 110 113 116 119', // 76
    '103 106 109 112 115 118', // 77
    '103 106 109 112 115 118', // 78
    '102 105 108 111 114 117', // 79
    '102 105 108 111 114 117', // 80
    '101 104 107 110 113 116', // 81
    '101 104 107 110 113 116', // 82
    '100 103 106 109 112 115', // 83
    '100 103 106 109 112 115'  // 84 en hoger
  ]);

  // Vrouwen: laatste regel (70) geldt voor "70 en hoger".
  var ROW_F = rows([
    '130 133 137 140 144 147', // 45
    '129 132 136 139 143 146', // 46
    '128 131 135 138 142 145', // 47
    '127 130 134 137 141 144', // 48
    '126 130 133 136 140 143', // 49
    '125 129 132 135 139 142', // 50
    '124 128 131 134 138 141', // 51
    '124 127 130 134 137 140', // 52
    '123 126 129 133 136 139', // 53
    '122 125 129 132 135 138', // 54
    '121 125 128 131 134 138', // 55
    '121 124 127 130 134 137', // 56
    '120 123 126 130 133 136', // 57
    '119 122 126 129 132 135', // 58
    '119 122 125 128 131 134', // 59
    '118 121 124 127 131 134', // 60
    '117 120 124 127 130 133', // 61
    '117 120 123 126 129 132', // 62
    '116 119 122 125 128 132', // 63
    '115 118 122 125 128 131', // 64
    '115 118 121 124 127 130', // 65
    '114 117 120 123 126 130', // 66
    '114 117 120 123 126 129', // 67
    '113 116 119 122 125 128', // 68
    '113 116 119 122 125 128', // 69
    '112 115 118 121 124 127'  // 70 en hoger
  ]);

  // Doelstellingen Q8. Kolommen: 18-29, 30-34, 35-39, 40-44, 45-49, 50 en ouder.
  // run = 1600 m in seconden (7:50 = 470).
  var Q8 = {
    m: {
      squats:  [45, 42, 39, 36, 33, 30],
      pushups: [30, 28, 26, 24, 22, 20],
      situps:  [40, 38, 36, 34, 32, 30],
      burpees: [15, 14, 13, 12, 11, 10],
      pullups: [6, 5, 4, 3, 2, 1],
      run:     [470, 480, 490, 500, 510, 520]
    },
    f: {
      squats:  [40, 38, 36, 34, 32, 30],
      pushups: [15, 14, 13, 12, 11, 10],
      situps:  [30, 28, 26, 24, 22, 20],
      burpees: [20, 19, 18, 17, 16, 15],
      pullups: [6, 5, 4, 3, 2, 1],
      run:     [525, 540, 555, 570, 585, 600]
    }
  };

  var EX = {
    rowing:  { key: 'rowing',  name: 'Roeien',    short: '500 m',  type: 'dist', distance: 500 },
    squats:  { key: 'squats',  name: 'Squats',    short: '',       type: 'reps' },
    pushups: { key: 'pushups', name: 'Push-ups',  short: '',       type: 'reps' },
    situps:  { key: 'situps',  name: 'Sit-ups',   short: '',       type: 'reps' },
    burpees: { key: 'burpees', name: 'Burpees',   short: '',       type: 'reps' },
    pullups: { key: 'pullups', name: 'Pull-ups',  short: '',       type: 'reps' },
    run:     { key: 'run',     name: 'Hardlopen', short: '1600 m', type: 'dist', distance: 1600 }
  };

  var CHART_ORDER = ['rowing', 'squats', 'pushups', 'situps', 'burpees', 'pullups', 'run'];

  /** Volgorde van de onderdelen tussen roeien en hardlopen; pull-ups op positie 1 t/m 5. */
  function repsOrder(pullupPos) {
    var p = parseInt(pullupPos, 10);
    if (!(p >= 1 && p <= 5)) p = 5;
    var base = ['squats', 'pushups', 'situps', 'burpees'];
    base.splice(p - 1, 0, 'pullups');
    return base;
  }

  /** 0 = 18-29 ... 5 = 50+; -1 = jonger dan 18. */
  function ageIndex(age) {
    if (!(age >= 18)) return -1;
    if (age < 30) return 0;
    if (age < 35) return 1;
    if (age < 40) return 2;
    if (age < 45) return 3;
    if (age < 50) return 4;
    return 5;
  }

  /** Seconden voor 500 m, of null vanaf 55 jaar (zo snel mogelijk). Gewicht wordt afgerond op hele kg. */
  function rowingSeconds(gender, age, weightKg) {
    var ai = ageIndex(age);
    if (ai < 0) return undefined;
    if (age >= 55) return null;
    var table = gender === 'f' ? ROW_F : ROW_M;
    var w = Math.round(weightKg);
    var maxW = 44 + table.length;
    if (w < 45) w = 45;
    if (w > maxW) w = maxW;
    return table[w - 45][ai];
  }

  function validate(p) {
    if (!p) return 'Vul je gegevens in.';
    if (p.gender !== 'm' && p.gender !== 'f') return 'Kies man of vrouw.';
    if (!(p.age >= 18 && p.age <= 99)) return 'Leeftijd moet tussen 18 en 99 jaar liggen.';
    if (!(p.weight >= 30 && p.weight <= 250)) return 'Vul een gewicht in tussen 30 en 250 kg.';
    return '';
  }

  /** Normen voor dit profiel; null als het profiel onvolledig is. */
  function normsFor(p) {
    if (validate(p)) return null;
    var age = Math.floor(p.age);
    var ai = ageIndex(age);
    var t = Q8[p.gender];
    return {
      rowing: rowingSeconds(p.gender, age, p.weight),
      squats: t.squats[ai],
      pushups: t.pushups[ai],
      situps: t.situps[ai],
      burpees: t.burpees[ai],
      pullups: t.pullups[ai],
      run: t.run[ai]
    };
  }

  /** m:ss, naar boven afgerond (voor aftellen). */
  function clock(sec) {
    sec = Math.max(0, Math.ceil(sec - 1e-9));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /** m:ss, naar beneden afgerond (voor optellen en vastgelegde tijden). */
  function clockUp(sec) {
    sec = Math.max(0, Math.floor(sec + 1e-9));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  return {
    EX: EX, CHART_ORDER: CHART_ORDER, ROW_M: ROW_M, ROW_F: ROW_F, Q8: Q8,
    repsOrder: repsOrder, ageIndex: ageIndex, rowingSeconds: rowingSeconds,
    validate: validate, normsFor: normsFor, clock: clock, clockUp: clockUp
  };
});
