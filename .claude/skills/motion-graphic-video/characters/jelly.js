// Jelly slime character (SVG): gumdrop body, light sticker rim, glossy gradient, a cute replaceable face.
// Origin = middle of the base on the ground; the body goes up to about y = -180.
//
//   const r = Jelly.make(svgParent, { color })   build a rig (needs <filter id="jshadow"> in the page)
//   Jelly.pose(r, 'happy')                      set a face straight away
//   Jelly.face(tl, r, from, to, at)              change face on a GSAP timeline (fromTo on plain state, seek-safe)
//   Jelly.blink(tl, r, at)                       quick blink
//   Jelly.apply(r, st, t)                        call every frame: draws body squash/hop/breathing + the face state
//
// Faces work like 2D cartoon "replacement" mouths: each eye/mouth shape is its own drawing; changing
// expression pops the old one out and the new one in with a little overshoot.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const INK = '#1B1F45', IN = '#1A1C4A', TONGUE = '#FF6F93', BLUSH = '#FF8CB1';

  const BODY = 'M-106,-18 C-114,-62 -98,-120 -66,-152 C-46,-172 -16,-182 8,-180 C42,-178 70,-160 88,-130 C108,-96 114,-52 106,-18 C100,2 66,6 0,6 C-66,6 -100,2 -106,-18 Z';
  const EX = 64, EY = -86, MY = -70;     // eye half-spacing & height, mouth top

  const EYES = ['dot', 'big', 'small', 'happy', 'sleepy', 'squeeze', 'spiral', 'teary', 'heart'];
  const MOUTHS = ['smile', 'cat', 'open', 'grin', 'o', 'O', 'wavy', 'frown', 'flat', 'smirk', 'grit', 'blep'];
  const EXTRAS = { sweat: [94, -132], tear: [-60, -64], shock: [0, -196], zzz: [92, -196], spark: [0, -160], q: [104, -178], bang: [104, -178], stars: [0, -196], hearts: [92, -176] };

  // expression presets (eyes [left, right], mouth, look offset, blush 0..1, hatch "///" 0..1, brow [show, angle] or null, extras, mouth shift/tilt)
  const EXPR = {
    neutral:    { eyes: ['dot', 'dot'],         mouth: 'smile', look: [0, 0],   blush: .45, hatch: 0, brow: null,      x: [] },
    happy:      { eyes: ['happy', 'happy'],     mouth: 'open',  look: [0, -2],  blush: .8,  hatch: 0, brow: null,      x: ['spark'] },
    excited:    { eyes: ['big', 'big'],         mouth: 'open',  look: [0, -3],  blush: .8,  hatch: 0, brow: null,      x: ['spark'] },
    wink:       { eyes: ['happy', 'dot'],       mouth: 'open',  look: [0, 0],   blush: .7,  hatch: 0, brow: null,      x: [], tilt: [8, -12] },
    content:    { eyes: ['happy', 'happy'],     mouth: 'cat',   look: [0, 0],   blush: .6,  hatch: 1, brow: null,      x: [] },
    curious:    { eyes: ['dot', 'big'],         mouth: 'o',     look: [6, -4],  blush: .4,  hatch: 0, brow: null,      x: ['q'] },
    shy:        { eyes: ['dot', 'dot'],         mouth: 'cat',   look: [-5, 5],  blush: .9,  hatch: 1, brow: null,      x: [] },
    nervous:    { eyes: ['small', 'small'],     mouth: 'wavy',  look: [7, 0],   blush: .35, hatch: 1, brow: [1, -14],  x: ['sweat'] },
    scared:     { eyes: ['big', 'big'],         mouth: 'O',     look: [0, 0],   blush: 0,   hatch: 0, brow: [1, -20],  x: ['sweat', 'shock'] },
    lazy:       { eyes: ['sleepy', 'sleepy'],   mouth: 'flat',  look: [0, 3],   blush: .4,  hatch: 0, brow: null,      x: ['zzz'] },
    strain:     { eyes: ['squeeze', 'squeeze'], mouth: 'grit',  look: [0, 0],   blush: .9,  hatch: 0, brow: null,      x: ['sweat'] },
    determined: { eyes: ['dot', 'dot'],         mouth: 'smirk', look: [5, 0],   blush: .5,  hatch: 0, brow: [1, 16],   x: [] },
    sad:        { eyes: ['teary', 'teary'],     mouth: 'frown', look: [0, 4],   blush: .3,  hatch: 0, brow: [1, -16],  x: ['tear'] },
    proud:      { eyes: ['happy', 'happy'],     mouth: 'grin',  look: [0, -4],  blush: .8,  hatch: 0, brow: null,      x: ['spark'] },
    love:       { eyes: ['heart', 'heart'],     mouth: 'open',  look: [0, -2],  blush: .9,  hatch: 0, brow: null,      x: ['hearts'] },
    dizzy:      { eyes: ['spiral', 'spiral'],   mouth: 'wavy',  look: [0, 0],   blush: .3,  hatch: 0, brow: null,      x: ['stars'] },
    playful:    { eyes: ['happy', 'dot'],       mouth: 'blep',  look: [0, 0],   blush: .7,  hatch: 0, brow: null,      x: [] },
    surprised:  { eyes: ['big', 'big'],         mouth: 'o',     look: [0, -3],  blush: .3,  hatch: 0, brow: [1, -10], x: ['bang'] },
    lookL:      { eyes: ['dot', 'dot'],         mouth: 'smile', look: [-10, -1], blush: .45, hatch: 0, brow: null,     x: [] },
    lookR:      { eyes: ['dot', 'dot'],         mouth: 'smile', look: [10, -1], blush: .45, hatch: 0, brow: null,     x: [] },
    talk:       { eyes: ['dot', 'dot'],         mouth: 'smile', look: [0, -2],  blush: .6,  hatch: 0, brow: null,     x: [] },
  };

  const star = (x, y, r) => { const k = .32; return `M${x},${y - r} L${x + r * k},${y - r * k} L${x + r},${y} L${x + r * k},${y + r * k} L${x},${y + r} L${x - r * k},${y + r * k} L${x - r},${y} L${x - r * k},${y - r * k} Z`; };
  const heart = (x, y, s) => `M${x},${y + 7 * s} C${x - 13 * s},${y - 1 * s} ${x - 11 * s},${y - 12 * s} ${x - 5 * s},${y - 12 * s} C${x - 2 * s},${y - 12 * s} ${x},${y - 9 * s} ${x},${y - 7.5 * s} C${x},${y - 9 * s} ${x + 2 * s},${y - 12 * s} ${x + 5 * s},${y - 12 * s} C${x + 11 * s},${y - 12 * s} ${x + 13 * s},${y - 1 * s} ${x},${y + 7 * s} Z`;
  // a big laughing mouth: circle A with a bite taken out of its top by circle B (upper lip pressing in)
  function bite(ax, ay, ar, bx, by, br) {
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
    const a = (ar * ar - br * br + d * d) / (2 * d), h = Math.sqrt(ar * ar - a * a);
    const px = ax + a * dx / d, py = ay + a * dy / d;
    let p1 = [px + h * dy / d, py - h * dx / d], p2 = [px - h * dy / d, py + h * dx / d];
    if (p1[0] < p2[0]) [p1, p2] = [p2, p1];                       // p1 = right corner, p2 = left corner
    const large = (p1[1] + p2[1]) / 2 < ay ? 1 : 0;                 // chord above the centre -> keep the big arc
    const f = n => n.toFixed(2);
    return `M${f(p1[0])},${f(p1[1])} A${ar},${ar} 0 ${large} 1 ${f(p2[0])},${f(p2[1])} A${br},${br} 0 0 0 ${f(p1[0])},${f(p1[1])} Z`;
  }
  const stroke = (w = 5) => ({ fill: 'none', stroke: INK, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

  function drawEye(g, k, s) {          // s = -1 left, +1 right; drawn around (0,0)
    if (k === 'dot') { el('ellipse', { rx: 8.5, ry: 11.5, fill: INK }, g); el('circle', { cx: 2.8, cy: -4.6, r: 3.1, fill: '#fff' }, g); }
    if (k === 'big') { el('ellipse', { rx: 11, ry: 14.5, fill: INK }, g); el('circle', { cx: 3.6, cy: -5.6, r: 4.4, fill: '#fff' }, g); el('circle', { cx: -3.8, cy: 5.2, r: 2, fill: '#fff' }, g); }
    if (k === 'small') { el('ellipse', { rx: 6, ry: 8, fill: INK }, g); el('circle', { cx: 2, cy: -3.2, r: 2.2, fill: '#fff' }, g); }
    if (k === 'happy') el('path', { d: 'M-11,5 Q0,-12 11,5', ...stroke(5.5) }, g);
    if (k === 'sleepy') el('path', { d: 'M-11,1 Q0,6 11,1', ...stroke(5) }, g);
    if (k === 'squeeze') el('path', { d: `M${8 * s},-9 L${-8 * s},0 L${8 * s},9`, ...stroke(5) }, g);
    if (k === 'spiral') el('path', { d: 'M0,0 m-2,0 a2,2 0 1,1 4,0 a4.5,4.5 0 1,1 -9,0 a7,7 0 1,1 14,0 a9.5,9.5 0 1,1 -19,0', ...stroke(3.2) }, g);
    if (k === 'teary') { el('ellipse', { rx: 10, ry: 13.5, fill: INK }, g); el('circle', { cx: 3.4, cy: -5, r: 4.2, fill: '#fff' }, g); el('circle', { cx: -3.2, cy: 4.4, r: 2.3, fill: '#fff' }, g); el('ellipse', { cx: 0, cy: 9.5, rx: 8, ry: 3.2, fill: '#A9DEFF', opacity: .9 }, g); }
    if (k === 'heart') { el('path', { d: heart(0, 2, 1.25), fill: '#FF5E8E' }, g); el('circle', { cx: -4.5, cy: -6, r: 2.4, fill: '#fff', opacity: .9 }, g); }
  }
  function drawMouth(g, k, id) {      // drawn with the top centre at (0,0)
    const OPEN = bite(0, 12, 40, -12, -52, 56);
    const GRIN = bite(0, 8, 24, -7, -30, 34);
    const BIGO = 'M-12,12 C-12,-10 12,-10 12,12 C12,32 -12,32 -12,12 Z';
    const inside = (d, tongue) => {
      el('path', { d, fill: IN }, g);
      const cid = id + 'm' + k;
      el('path', { d }, el('clipPath', { id: cid }, g));
      const tg = el('g', { 'clip-path': `url(#${cid})` }, g);
      el('ellipse', { ...tongue, fill: TONGUE }, tg);
      el('ellipse', { cx: tongue.cx - tongue.rx * .3, cy: tongue.cy - tongue.ry * .35, rx: tongue.rx * .3, ry: tongue.ry * .25, fill: '#FFC2D2', opacity: .8 }, tg);
    };
    if (k === 'smile') el('path', { d: 'M-13,0 Q0,13 13,0', ...stroke(5) }, g);
    if (k === 'cat') el('path', { d: 'M-17,0 Q-8.5,11 0,2 Q8.5,11 17,0', ...stroke(5) }, g);
    if (k === 'open') inside(OPEN, { cx: 7, cy: 42, rx: 25, ry: 16 });
    if (k === 'grin') inside(GRIN, { cx: 4, cy: 25, rx: 15, ry: 10 });
    if (k === 'o') el('ellipse', { cx: 0, cy: 7, rx: 7, ry: 8.5, fill: IN }, g);
    if (k === 'O') inside(BIGO, { cx: 0, cy: 28, rx: 9, ry: 6 });
    if (k === 'wavy') el('path', { d: 'M-18,4 Q-13.5,-3 -9,4 T0,4 T9,4 T18,4', ...stroke(4.5) }, g);
    if (k === 'frown') el('path', { d: 'M-11,9 Q0,-2 11,9', ...stroke(5) }, g);
    if (k === 'flat') el('path', { d: 'M-8,5 L8,5', ...stroke(5) }, g);
    if (k === 'smirk') el('path', { d: 'M-14,3 Q2,13 16,-3', ...stroke(5) }, g);
    if (k === 'grit') { el('rect', { x: -18, y: -1, width: 36, height: 15, rx: 7, fill: '#fff', stroke: INK, 'stroke-width': 4 }, g); el('path', { d: 'M-14,6.5 L14,6.5', stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g); }
    if (k === 'blep') { el('path', { d: 'M-4,5 C-6,17 6,17 4,5 Z', fill: TONGUE, stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, g); el('path', { d: 'M-14,0 Q0,12 14,0', ...stroke(5) }, g); }
  }

  let uid = 0;
  function make(parent, o = {}) {
    const C = Object.assign({ top: '#93D4FF', main: '#4BA9F6', deep: '#2A82DE', rim: '#E3F4FF', speck: '#C9EBFF' }, o.color || {});
    const id = 'jl' + (++uid);
    const root = el('g', { class: 'jelly' }, parent);
    const defs = el('defs', {}, root);
    const lg = el('linearGradient', { id: id + 'g', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': C.top }, lg); el('stop', { offset: '.5', 'stop-color': C.main }, lg); el('stop', { offset: '1', 'stop-color': C.deep }, lg);
    const rg = el('radialGradient', { id: id + 'r', cx: '.42', cy: '.38', r: '.6' }, defs);
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': .32 }, rg); el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': 0 }, rg);
    el('path', { d: BODY }, el('clipPath', { id: id + 'c' }, defs));

    const shadow = el('ellipse', { cx: 0, cy: 4, rx: 94, ry: 13, fill: '#1B3A6B', opacity: .22 }, root);
    const bodyG = el('g', {}, root);
    const shape = el('g', { filter: o.filter || 'url(#jshadow)' }, bodyG);
    el('path', { d: BODY, fill: C.rim, stroke: C.rim, 'stroke-width': 20, 'stroke-linejoin': 'round' }, shape);
    el('path', { d: BODY, fill: `url(#${id}g)` }, shape);
    const inner = el('g', { 'clip-path': `url(#${id}c)` }, shape);
    el('ellipse', { cx: -6, cy: -110, rx: 92, ry: 70, fill: `url(#${id}r)` }, inner);
    el('ellipse', { cx: 10, cy: 18, rx: 124, ry: 34, fill: C.deep, opacity: .55 }, inner);
    [[58, -30, 6.5], [34, -14, 4], [84, -50, 3.5], [-66, -28, 4.5], [-38, -12, 3]].forEach(([x, y, rr]) => el('circle', { cx: x, cy: y, r: rr, fill: C.speck, opacity: .5 }, inner));
    const gloss = el('g', {}, shape);
    el('ellipse', { cx: -46, cy: -136, rx: 24, ry: 12.5, fill: '#fff', opacity: .92, transform: 'rotate(-40 -46 -136)' }, gloss);
    el('circle', { cx: -12, cy: -162, r: 6.5, fill: '#fff', opacity: .9 }, gloss);

    // ---- face
    const face = el('g', {}, bodyG);
    const cheeks = [-1, 1].map(s => {
      const g = el('g', {}, face);
      const blush = el('ellipse', { cx: s * 84, cy: -60, rx: 14, ry: 8, fill: BLUSH }, g);
      const hatch = el('g', { stroke: '#FF72A2', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
      [-1, 0, 1].forEach(i => el('line', { x1: s * 84 + i * 7 + 4, y1: -67, x2: s * 84 + i * 7 - 3, y2: -55 }, hatch));
      return { blush, hatch };
    });
    const eyes = [-1, 1].map(s => {
      const slot = el('g', {}, face);
      const v = {};
      EYES.forEach(k => { v[k] = el('g', { visibility: 'hidden' }, slot); drawEye(v[k], k, s); });
      return { slot, v, s };
    });
    const brows = [-1, 1].map(s => el('path', { d: `M${s * EX - 10},${EY - 25} L${s * EX + 10},${EY - 25}`, ...stroke(4.5), opacity: 0 }, face));
    const mslot = el('g', {}, face);
    const mv = {};
    MOUTHS.forEach(k => { mv[k] = el('g', { visibility: 'hidden' }, mslot); drawMouth(mv[k], k, id); });
    // talking mouth: an open mouth whose opening follows the voice, closing into a small smile between syllables
    const talkOpen = el('g', { visibility: 'hidden' }, mslot); drawMouth(talkOpen, 'open', id + 't');
    const talkShut = el('g', { visibility: 'hidden' }, mslot); drawMouth(talkShut, 'smile', id + 't');
    // extras (drawn in body space; popped around their anchor)
    const X = {};
    const xg = k => (X[k] = el('g', { visibility: 'hidden' }, face));
    el('path', { d: 'M94,-146 C100,-136 104,-128 100,-122 C96,-117 88,-119 88,-126 C88,-132 92,-140 94,-146 Z', fill: '#C6EBFF', stroke: '#fff', 'stroke-width': 2.5 }, xg('sweat'));
    el('path', { d: 'M-60,-74 C-56,-64 -52,-58 -55,-53 C-58,-49 -64,-50 -65,-55 C-66,-60 -62,-67 -60,-74 Z', fill: '#BFE6FF', stroke: '#fff', 'stroke-width': 2 }, xg('tear'));
    xg('shock'); [[-72, -192, -90, -216], [6, -202, 6, -232], [82, -190, 100, -214]].forEach(([a, b, c, d]) => el('line', { x1: a, y1: b, x2: c, y2: d, stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, X.shock));
    const z = el('text', { x: 80, y: -192, 'font-family': 'Huninn, sans-serif', 'font-size': 38, fill: INK }, xg('zzz')); z.textContent = 'z z';
    xg('spark'); [[-110, -164, 14], [110, -146, 11], [92, -196, 7]].forEach(([x, y, r]) => el('path', { d: star(x, y, r), fill: '#FFD43B', stroke: '#fff', 'stroke-width': 2.5 }, X.spark));
    const q = el('text', { x: 92, y: -164, 'font-family': 'Huninn, sans-serif', 'font-size': 56, fill: INK }, xg('q')); q.textContent = '?';
    const b = el('text', { x: 96, y: -164, 'font-family': 'Huninn, sans-serif', 'font-size': 60, fill: '#FF5E8E' }, xg('bang')); b.textContent = '!';
    xg('stars'); [[-46, 0], [0, 0], [46, 0]].forEach(([x], i) => el('path', { d: star(x, -196 + (i === 1 ? -10 : 0), 10), fill: '#FFD43B', stroke: '#fff', 'stroke-width': 2 }, X.stars));
    xg('hearts'); el('path', { d: heart(96, -170, 1.1), fill: '#FF5E8E', stroke: '#fff', 'stroke-width': 2 }, X.hearts); el('path', { d: heart(118, -200, .7), fill: '#FF8FB0', stroke: '#fff', 'stroke-width': 1.5 }, X.hearts);

    const r = { root, shadow, bodyG, shape, gloss, face, eyes, brows, mslot, mv, talkOpen, talkShut, cheeks, X, C, id };
    r.fs = blankState();
    return r;
  }

  // ---- face state (plain numbers so GSAP can tween it on the master timeline)
  function blankState() {
    const zero = keys => Object.fromEntries(keys.map(k => [k, 0]));
    return { eye: [zero(EYES), zero(EYES)], mouth: zero(MOUTHS), x: zero(Object.keys(EXTRAS)),
      look: { x: 0, y: 0 }, blink: { l: 0, r: 0 }, cheek: { blush: 0, hatch: 0 }, brow: { a: 0, ang: 0 }, mt: { x: 0, rot: 0 }, talk: { on: 0, v: 0 } };
  }
  function target(name) {
    const e = EXPR[name];
    const s = blankState();
    e.eyes.forEach((k, i) => { s.eye[i][k] = 1; });
    s.mouth[e.mouth] = 1;
    e.x.forEach(k => { s.x[k] = 1; });
    s.look = { x: e.look[0], y: e.look[1] };
    s.cheek = { blush: e.blush, hatch: e.hatch };
    s.brow = e.brow ? { a: 1, ang: e.brow[1] } : { a: 0, ang: 0 };
    s.mt = e.tilt ? { x: e.tilt[0], rot: e.tilt[1] } : { x: 0, rot: 0 };
    return s;
  }
  function pose(r, name) {
    const s = target(name);
    const fs = r.fs;
    fs.eye.forEach((o, i) => Object.assign(o, s.eye[i]));
    Object.assign(fs.mouth, s.mouth); Object.assign(fs.x, s.x); Object.assign(fs.look, s.look);
    Object.assign(fs.cheek, s.cheek); Object.assign(fs.brow, s.brow); Object.assign(fs.mt, s.mt);
    r.cur = name;
  }
  // pop the changed shapes: old ones shrink away fast, new ones spring in with overshoot
  function face(tl, r, from, to, at, o = {}) {
    const a = target(from), b = target(to), fs = r.fs;
    const swap = (obj, A, B) => {
      for (const k in A) {
        if (A[k] === B[k]) continue;
        if (B[k] > A[k]) tl.fromTo(obj, { [k]: A[k] }, { [k]: B[k], duration: o.inDur ?? .2, ease: 'back.out(2.6)', immediateRender: false }, at + .05);
        else tl.fromTo(obj, { [k]: A[k] }, { [k]: B[k], duration: .08, ease: 'power2.in', immediateRender: false }, at);
      }
    };
    swap(fs.eye[0], a.eye[0], b.eye[0]); swap(fs.eye[1], a.eye[1], b.eye[1]);
    swap(fs.mouth, a.mouth, b.mouth); swap(fs.x, a.x, b.x);
    const ease = 'power2.out', d = o.dur ?? .24;
    tl.fromTo(fs.look, { ...a.look }, { ...b.look, duration: d, ease, immediateRender: false }, at);
    tl.fromTo(fs.cheek, { ...a.cheek }, { ...b.cheek, duration: d * 1.4, ease, immediateRender: false }, at);
    tl.fromTo(fs.brow, { ...a.brow }, { ...b.brow, duration: d, ease, immediateRender: false }, at);
    tl.fromTo(fs.mt, { ...a.mt }, { ...b.mt, duration: d, ease: 'back.out(2)', immediateRender: false }, at);
    r.cur = to;
  }
  function blink(tl, r, at) {
    const bl = r.fs.blink;
    tl.fromTo(bl, { l: 0, r: 0 }, { l: 1, r: 1, duration: .06, ease: 'power1.in', immediateRender: false }, at);
    tl.fromTo(bl, { l: 1, r: 1 }, { l: 0, r: 0, duration: .11, ease: 'power1.out', immediateRender: false }, at + .08);
  }

  // ---- body motion
  const HOP_H = 70;
  function hopShape(c, amt) {
    const p = c - Math.floor(c);
    const q = Math.min(1, Math.max(0, (p - .18) / .6));            // air time 0.18..0.78
    const lift = HOP_H * amt * Math.sin(Math.PI * q);
    let sx = 1, sy = 1;
    if (p < .18) { const k = Math.sin(Math.PI * p / .18); sy -= .2 * amt * k; sx += .16 * amt * k; }          // crouch (anticipation)
    else if (q < 1) { const v = Math.cos(Math.PI * q); const s = .16 * amt * Math.max(0, Math.abs(v) - .15); sy += s; sx -= s * .7; }   // stretch near take-off / landing
    else { const k = (p - .78) / .22; const w = Math.exp(-5 * k) * Math.cos(k * Math.PI * 3.2); sy -= .22 * amt * w; sx += .18 * amt * w; }  // land + jiggle
    return { lift, sx, sy, vy: q > 0 && q < 1 ? Math.cos(Math.PI * q) : 0 };
  }
  const vis = (node, v, tf) => {
    if (v <= .002) { node.setAttribute('visibility', 'hidden'); return; }
    node.setAttribute('visibility', 'visible');
    node.setAttribute('opacity', Math.min(1, v * 2.5));
    node.setAttribute('transform', tf(Math.max(0, v)));
  };
  function drawFace(r, t) {
    const fs = r.fs;
    r.eyes.forEach(({ slot, v, s }, i) => {
      const bl = i ? fs.blink.r : fs.blink.l;
      slot.setAttribute('transform', `translate(${s * EX + fs.look.x} ${EY + fs.look.y}) scale(1 ${1 - .88 * bl})`);
      EYES.forEach(k => vis(v[k], fs.eye[i][k], p => `scale(${p})`));
    });
    r.mslot.setAttribute('transform', `translate(${fs.mt.x + fs.look.x * .5} ${MY + fs.look.y * .4}) rotate(${fs.mt.rot})`);
    const on = fs.talk.on, tv = fs.talk.v;
    MOUTHS.forEach(k => vis(r.mv[k], fs.mouth[k] * (1 - on), p => `translate(0 10) scale(${p}) translate(0 -10)`));
    vis(r.talkOpen, on * Math.min(1, tv * 6), () => `translate(0 4) scale(${.62 + .3 * tv} ${.08 + .86 * tv}) translate(0 -4)`);
    vis(r.talkShut, on * Math.max(0, 1 - tv * 5), () => 'scale(.9)');
    r.cheeks.forEach(c => { c.blush.setAttribute('opacity', Math.min(1, 1.1 * fs.cheek.blush)); c.hatch.setAttribute('opacity', fs.cheek.hatch); });
    r.brows.forEach((b, i) => { const s = i ? 1 : -1; b.setAttribute('opacity', fs.brow.a); b.setAttribute('transform', `translate(${fs.look.x * .6} ${fs.look.y * .5}) rotate(${-s * fs.brow.ang} ${s * EX} ${EY - 25})`); });
    for (const k in EXTRAS) {
      const [ax, ay] = EXTRAS[k], v = fs.x[k];
      let extra = '';
      if (k === 'spark') extra = ` rotate(${8 * Math.sin(t * 3)} ${ax} ${ay})`;
      if (k === 'zzz') extra = ` translate(${3 * Math.sin(t * 1.7)} ${-5 * Math.sin(t * 2.2)})`;
      if (k === 'stars') extra = ` rotate(${(t * 140) % 360} ${ax} ${ay + 8}) `;
      if (k === 'hearts') extra = ` translate(0 ${-4 * Math.sin(t * 3)})`;
      vis(r.X[k], v, p => `translate(${ax} ${ay}) scale(${p}) translate(${-ax} ${-ay})${extra}`);
    }
  }
  // st: { hop, amt, sx, sy, lift, rot, look (-1..1 face turn), dir (travel direction), seed }
  function apply(r, st = {}, t = 0) {
    const amt = st.amt || 0;
    const h = amt > 0 ? hopShape(st.hop || 0, amt) : { lift: 0, sx: 1, sy: 1, vy: 0 };
    const breathe = 1 + 0.016 * Math.sin(t * 2.6 + (st.seed || 0));
    const sy = h.sy * (st.sy ?? 1) * breathe, sx = h.sx * (st.sx ?? 1) / Math.sqrt(breathe);
    const lift = h.lift + (st.lift || 0);
    r.bodyG.setAttribute('transform', `translate(0 ${-lift}) rotate(${st.rot || 0} 0 -80) scale(${sx} ${sy})`);
    const fy = -h.vy * 7 * amt + (st.fdy || 0), fx = (st.look || 0) * 18 - (st.dir || 0) * 5 * amt;
    r.face.setAttribute('transform', `translate(${fx} ${fy})`);
    const f = Math.min(1, lift / 160);
    r.shadow.setAttribute('transform', `scale(${(1 - .45 * f) * (st.sx ?? 1) * h.sx} 1)`);
    r.shadow.setAttribute('opacity', .22 * (1 - .5 * f));
    drawFace(r, t);
  }
  window.Jelly = { make, pose, face, blink, apply, hopShape, EXPR, BODY };
})();
