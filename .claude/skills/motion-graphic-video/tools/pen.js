// Hand-drawn strokes: seeded wobble, overshoot, unclosed circles, marker highlights.
// Paths are drawn on the timeline with stroke-dashoffset at a pen-like speed.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let seed = 20260827;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const R = (a, b) => a + (b - a) * rnd();
  const f = n => n.toFixed(1);

  function smooth(pts) {
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return d;
  }

  const Pen = {
    R, seed: s => { seed = s; },
    line(x1, y1, x2, y2, o = {}) {
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      const bow = (o.bow ?? 0.018) * len * (o.bowDir ?? R(-1, 1));
      const n = Math.max(3, Math.round(len / 110));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, b = Math.sin(Math.PI * t) * bow;
        const j = (i === 0 || i === n) ? 0 : R(-1, 1) * (o.jitter ?? 1.1);
        pts.push([x1 + (x2 - x1) * t + nx * (b + j), y1 + (y2 - y1) * t + ny * (b + j)]);
      }
      return smooth(pts);
    },
    // unclosed hand circle around a box
    circle(cx, cy, rx, ry, o = {}) {
      const a0 = o.start ?? R(-2.5, -1.9), over = o.over ?? R(0.35, 0.6), tilt = o.tilt ?? R(-0.1, 0.1);
      const spiral = o.spiral ?? R(0.05, 0.1), ph = R(0, 6.28), n = 56, pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = a0 + t * (Math.PI * 2 + over);
        const k = 1 + 0.03 * Math.sin(3 * a + ph) + spiral * (t - 0.5);
        const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
        pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
      }
      return smooth(pts);
    },
    box(x, y, w, h, o = {}) {
      const ov = o.over ?? 10, j = o.j ?? 4;
      return [
        Pen.line(x - ov, y + R(-j, j), x + w + R(0, ov), y + R(-j, j)),
        Pen.line(x + w + R(-j, j), y - R(0, ov), x + w + R(-j, j), y + h + R(0, ov)),
        Pen.line(x + w + R(0, ov), y + h + R(-j, j), x - R(0, ov), y + h + R(-j, j)),
        Pen.line(x + R(-j, j), y + h + R(0, ov), x + R(-j, j), y - R(0, ov)),
      ].join(' ');
    },
    // curved arrow with a two-stroke head
    arrow(x1, y1, x2, y2, o = {}) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len, bend = (o.bend ?? 0.15) * len;
      const cx = (x1 + x2) / 2 + nx * bend, cy = (y1 + y2) / 2 + ny * bend;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, u = 1 - t;
        pts.push([u * u * x1 + 2 * u * t * cx + t * t * x2 + (i % 12 ? R(-0.8, 0.8) : 0), u * u * y1 + 2 * u * t * cy + t * t * y2 + (i % 12 ? R(-0.8, 0.8) : 0)]);
      }
      const ang = Math.atan2(y2 - cy, x2 - cx), hl = o.head ?? 26;
      const h1 = ang + Math.PI - 0.5 + R(-0.08, 0.08), h2 = ang + Math.PI + 0.45 + R(-0.08, 0.08);
      return smooth(pts) +
        ` M${f(x2 + Math.cos(h1) * hl)},${f(y2 + Math.sin(h1) * hl)} L${f(x2)},${f(y2)} L${f(x2 + Math.cos(h2) * hl * 0.9)},${f(y2 + Math.sin(h2) * hl * 0.9)}`;
    },
    tick(x, y, s = 1) {
      return smooth([[x - 22 * s, y - 6 * s], [x - 12 * s, y + 4 * s], [x - 3 * s, y + 16 * s], [x + 14 * s, y - 14 * s], [x + 34 * s, y - 40 * s]]);
    },
    cross(x, y, s = 1) {
      return Pen.line(x - 20 * s, y - 20 * s, x + 22 * s, y + 18 * s, { bow: 0.05 }) + ' ' + Pen.line(x + 20 * s, y - 22 * s, x - 18 * s, y + 20 * s, { bow: 0.05 });
    },
    // strike-through, rising slightly like a quick pen stroke
    strike(x1, y, x2) { return Pen.line(x1 - 8, y + R(2, 6), x2 + 10, y - R(2, 7), { bow: 0.01 }); },
    underline(x1, y, x2, o = {}) {
      if (!o.wave) return Pen.line(x1 - 6, y + R(-2, 2), x2 + R(4, 16), y + R(-4, 3), { bow: 0.012 });
      const pts = [], n = Math.round((x2 - x1) / 26);
      for (let i = 0; i <= n; i++) pts.push([x1 + (x2 - x1) * i / n, y + (i % 2 ? -1 : 1) * (o.wave) + R(-1, 1)]);
      return smooth(pts);
    },
    // zig-zag hatching inside a box (pen filling a bar)
    hatch(x, y, w, h, gap = 16) {
      const pts = [];
      let up = true;
      for (let i = 0; i * gap <= w + h; i++) {
        const d = i * gap;
        // diagonal line points: from bottom-left side going to top-right
        const a = [x + Math.max(0, d - h), y + h - Math.min(h, d)];
        const b = [x + Math.min(w, d), y + h - Math.max(0, d - w)];
        if (up) { pts.push(a, b); } else { pts.push(b, a); }
        up = !up;
      }
      let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
      for (let i = 1; i < pts.length; i++) d += ` L${f(pts[i][0] + R(-1.5, 1.5))},${f(pts[i][1] + R(-1.5, 1.5))}`;
      return d;
    },
    // Chinese tally "正": 5 strokes in a size×size box; returns array of stroke paths
    zheng(x, y, s, count = 5) {
      const S = [
        () => Pen.line(x + s * .08, y + s * .1, x + s * .9, y + s * .08, { bow: .02 }),
        () => Pen.line(x + s * .5, y + s * .1, x + s * .5, y + s * .95, { bow: .02 }),
        () => Pen.line(x + s * .52, y + s * .5, x + s * .82, y + s * .5, { bow: .02 }),
        () => Pen.line(x + s * .22, y + s * .42, x + s * .22, y + s * .95, { bow: .02 }),
        () => Pen.line(x + s * .02, y + s * .96, x + s * .98, y + s * .93, { bow: .02 }),
      ];
      return S.slice(0, count).map(g => g());
    },
    // one-stroke star (pentagram order), a little lopsided
    star(cx, cy, r) {
      const pts = [0, 2, 4, 1, 3, 0].map((k, i) => {
        const a = -Math.PI / 2 + k * 2 * Math.PI / 5 + R(-0.06, 0.06);
        const rr = r * R(0.92, 1.06);
        return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
      });
      return 'M' + pts.map(p => `${f(p[0])},${f(p[1])}`).join(' L');
    },
    // marker highlight: one chisel stroke across a text box
    marker(x, y, w, h) {
      const tilt = R(-3, 3);
      return Pen.line(x - 8, y + h * 0.55 + tilt / 2, x + w + 10, y + h * 0.55 - tilt / 2, { bow: 0.004, jitter: 0.6 });
    },
  };

  // Attach a path to a layer and draw it on MG.tl
  Pen.draw = function (layer, d, at, o = {}) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', o.color || 'currentColor');
    p.setAttribute('stroke-width', o.width ?? 5);
    p.setAttribute('stroke-linecap', o.cap || 'round');
    p.setAttribute('stroke-linejoin', 'round');
    if (o.opacity != null) p.setAttribute('stroke-opacity', o.opacity);
    MG.one(layer).appendChild(p);
    const len = p.getTotalLength();
    const dur = o.dur ?? Math.min(1.2, Math.max(0.18, len / (o.speed ?? 1900)));
    p.style.strokeDasharray = `${len + 2} ${len + 40}`;
    MG.tl.fromTo(p, { strokeDashoffset: len + 2 }, { strokeDashoffset: 0, duration: dur,
      ease: o.ease ?? 'power1.inOut', immediateRender: true }, at);
    // hidden before its start (avoids round-cap dots), snaps visible as the pen lands
    MG.tl.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.001, immediateRender: true }, at);
    p.__end = at + dur;
    if (!o.silent) MG.sfx(layer === '#hl' ? 'marker' : 'pen', at, { dur: Math.round(dur * 1000) / 1000, len: Math.round(len) });
    return p;
  };
  window.Pen = Pen;
})();
