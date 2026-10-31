/* Eenvoudige lijngrafiek als inline SVG (geen externe bibliotheken nodig). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Q8Charts = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * points: [{ v, label, pass }] in tijdsvolgorde.
   * opts.kind: 'pct' (0..max, doellijn op 100) of 'time' (seconden, lager is beter).
   */
  function line(points, opts) {
    opts = opts || {};
    var W = 320, H = 170, L = 40, R = 14, T = 14, B = 28;
    var pw = W - L - R, ph = H - T - B;
    var vals = points.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var lo, hi;

    if (opts.kind === 'time') {
      var pad = Math.max(5, (max - min) * 0.25);
      lo = Math.max(0, Math.floor((min - pad) / 10) * 10);
      hi = Math.ceil((max + pad) / 10) * 10;
      if (hi <= lo) hi = lo + 10;
    } else {
      lo = 0;
      hi = Math.max(120, Math.ceil((max + 5) / 10) * 10);
    }

    function y(v) { return T + (hi - v) / (hi - lo) * ph; }
    function x(i) { return points.length === 1 ? L + pw / 2 : L + i * pw / (points.length - 1); }
    function fmt(v) { return opts.kind === 'time' ? String(Math.round(v)) : Math.round(v) + '%'; }

    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      esc(opts.label || 'Grafiek') + '">';

    // rasterlijnen en as-labels
    for (var i = 0; i <= 4; i++) {
      var gv = lo + (hi - lo) * i / 4;
      svg += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(gv).toFixed(1) +
        '" y2="' + y(gv).toFixed(1) + '"/>';
      svg += '<text class="ax" x="' + (L - 6) + '" y="' + (y(gv) + 3.5).toFixed(1) +
        '" text-anchor="end">' + fmt(gv) + '</text>';
    }

    // doellijn op 100% (norm)
    if (opts.kind !== 'time' && hi >= 100) {
      svg += '<line class="target" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(100).toFixed(1) +
        '" y2="' + y(100).toFixed(1) + '"/>';
    }

    // lijn
    if (points.length > 1) {
      var d = points.map(function (p, i) {
        return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1);
      }).join(' ');
      svg += '<path class="trend" d="' + d + '"/>';
    }

    // punten
    points.forEach(function (p, i) {
      var cls = p.pass === true ? 'pt ok' : p.pass === false ? 'pt bad' : 'pt';
      svg += '<circle class="' + cls + '" cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="4.5"/>';
    });

    // datums onder de grafiek: eerste, laatste en (bij veel punten) de middelste
    var labelAt = [0];
    if (points.length > 1) labelAt.push(points.length - 1);
    if (points.length >= 5) labelAt.push(Math.floor((points.length - 1) / 2));
    labelAt.forEach(function (i) {
      var anchor = i === 0 && points.length > 1 ? 'start' : i === points.length - 1 && points.length > 1 ? 'end' : 'middle';
      var lx = anchor === 'start' ? L : anchor === 'end' ? W - R : x(i);
      svg += '<text class="ax" x="' + lx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + anchor + '">' +
        esc(points[i].label) + '</text>';
    });

    return svg + '</svg>';
  }

  return { line: line };
});
