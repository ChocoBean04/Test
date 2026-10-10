// Swiss-style motion system on top of MG (tools/lib.js): beat grid, scene wipes, HUD chrome, kinetic type helpers.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const G = window.GRID;
  const SW = {};
  const tl = () => MG.tl;
  const q = s => typeof s === 'string' ? document.querySelector(s) : s, qa = s => MG.$(s);
  SW.q = q; SW.qa = qa;

  // ---- beat grid: T(bar, beatOffset) — beatOffset may be fractional (8ths = .5)
  SW.T = (k, b = 0) => {
    const i = G.phase + 4 * k + b;
    const lo = Math.floor(i), fr = i - lo;
    const bt = G.beats;
    const at = j => j < bt.length ? bt[j] : bt[bt.length - 1] + (j - bt.length + 1) * G.beat;
    return at(lo) + (at(lo + 1) - at(lo)) * fr;
  };
  SW.beat = G.beat;

  // ---- scenes: each <section class="sc"> has its own .bg; later scenes stack above earlier ones
  let z = 10, prev = document.querySelector('.sc');
  SW.scene = (sel, at, kind = 'cut', o = {}) => {
    const el = q(sel);
    el.style.zIndex = z++;
    const bg = el.querySelector('.bg');
    const d = o.dur ?? 0.55;
    tl().fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: true }, at - (kind === 'cut' ? 0 : d * 0.62));
    const t0 = at - d * 0.62; // transition lands (mostly covered) on the beat
    if (kind === 'wipeL' || kind === 'wipeR' || kind === 'wipeU' || kind === 'wipeD') {
      const from = { wipeL: 'inset(0 0 0 100%)', wipeR: 'inset(0 100% 0 0)', wipeU: 'inset(100% 0 0 0)', wipeD: 'inset(0 0 100% 0)' }[kind];
      tl().fromTo(el, { clipPath: from }, { clipPath: 'inset(0 0 0 0%)', duration: d, ease: 'expo.inOut', immediateRender: true }, t0);
    } else if (kind === 'iris') {
      const [cx, cy] = o.at || [960, 540];
      tl().fromTo(el, { clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(2300px at ${cx}px ${cy}px)`, duration: d * 1.2, ease: 'expo.in', immediateRender: true }, t0);
    } else if (kind === 'shutter') {
      // horizontal bands close one after another
      const n = 6, bands = [];
      for (let i = 0; i < n; i++) {
        const b = document.createElement('div');
        Object.assign(b.style, { position: 'absolute', left: 0, right: 0, top: (i * 100 / n) + '%', height: (100 / n + 0.2) + '%', background: o.color || getComputedStyle(bg).backgroundColor, transformOrigin: i % 2 ? '100% 50%' : '0% 50%' });
        el.parentNode.insertBefore(b, el); bands.push(b);
        b.style.zIndex = z - 1;
      }
      el.style.zIndex = z++;
      tl().fromTo(bands, { scaleX: 0 }, { scaleX: 1, duration: d * 0.8, ease: 'expo.inOut', stagger: 0.04, immediateRender: true }, t0);
      tl().fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.001, immediateRender: true }, t0 + d * 0.8 + 0.2);
      tl().set(bands, { autoAlpha: 0 }, t0 + d * 0.8 + 0.25);
    }
    if (prev) tl().set(prev, { autoAlpha: 0 }, at + 0.6);
    prev = el;
    if (o.sound !== false) MG.sfx(kind === 'cut' ? 'click' : 'whoosh', kind === 'cut' ? at : t0);
    if (o.hud) SW.hudColor(kind === 'cut' ? at : t0 + d * 0.5, o.hud);
    if (o.label) SW.label(at, o.label, o.n);
    return at;
  };

  // ---- HUD chrome: crop marks, labels, counter, timecode, progress
  let hudC = null;
  SW.hudColor = (at, color) => {
    if (hudC === null) { hudC = getComputedStyle(q('#hud')).color; }
    tl().fromTo('#hud', { color: hudC }, { color, duration: 0.18, ease: 'none', immediateRender: false }, at);
    hudC = color;
  };
  SW.label = (at, text, n) => {
    const el = q('#hud-bl'), cn = q('#hud-n');
    tl().set(el, { textContent: text }, at);
    tl().fromTo(el, { opacity: 0, x: -10 }, { opacity: 0.85, x: 0, duration: 0.4, ease: 'power3.out', immediateRender: false }, at + 0.02);
    if (n != null) tl().set(cn, { textContent: String(n).padStart(2, '0') }, at);
  };
  SW.hud = (total, fps = 60) => {
    const tc = q('#hud-tc'), bar = q('#hud-bar i');
    MG.onFrame(t => {
      const f = Math.floor(t * fps) % fps, s = Math.floor(t) % 60, m = Math.floor(t / 60);
      tc.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
      bar.style.width = Math.min(100, (t / total) * 100).toFixed(3) + '%';
    });
  };

  // ---- kinetic type
  // wrap each .ln > span line for masked rise; chars rise one after another on 8th notes
  SW.rise = (sel, at, o = {}) => {
    qa(sel).forEach((ln, i) => {
      const inner = ln.firstElementChild;
      const ch = MG.split(inner);
      tl().fromTo(ch, { yPercent: o.from ?? 120 }, { yPercent: 0, duration: o.dur ?? 0.62, ease: o.ease ?? 'expo.out', stagger: o.each ?? 0.045, immediateRender: true }, at + i * (o.gap ?? SW.beat));
    });
  };
  // horizontal smear entrance (directional blur that resolves to sharp)
  let fid = 0;
  SW.smear = (sel, at, o = {}) => {
    qa(sel).forEach((el, i) => {
      const id = 'sm' + (fid++);
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
      svg.innerHTML = `<filter id="${id}" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
      document.body.appendChild(svg);
      el.style.filter = `url(#${id})`;
      const blur = svg.querySelector('feGaussianBlur');
      const dx = o.x ?? -420, t = at + i * (o.stagger ?? 0.09);
      tl().fromTo(el, { x: dx, opacity: 0 }, { x: 0, opacity: 1, duration: o.dur ?? 0.55, ease: o.ease ?? 'expo.out', immediateRender: true }, t);
      tl().fromTo(blur, { attr: { stdDeviation: `${Math.abs(dx) / 9} 0` } }, { attr: { stdDeviation: '0 0' }, duration: (o.dur ?? 0.55) * 0.7, ease: 'power3.out', immediateRender: true }, t);
    });
  };
  SW.pop = (sel, at, o = {}) => {
    tl().fromTo(qa(sel), { scale: o.from ?? 0, opacity: 0 }, { scale: 1, opacity: 1, duration: o.dur ?? 0.55, ease: o.ease ?? 'back.out(2)', stagger: o.stagger ?? SW.beat / 2, immediateRender: true, transformOrigin: o.origin ?? '50% 50%' }, at);
  };
  SW.fade = (sel, at, o = {}) => {
    tl().fromTo(qa(sel), { opacity: 0, y: o.y ?? 16 }, { opacity: o.to ?? 1, y: 0, duration: o.dur ?? 0.5, ease: o.ease ?? 'power2.out', stagger: o.stagger ?? 0.08, immediateRender: true }, at);
  };
  SW.type = (sel, at, o = {}) => MG.typeset(qa(sel), at, { each: o.each ?? 0.022, fade: 0.01, gap: o.gap ?? 0.1 });
  // solid bar strike-through (Swiss style)
  SW.strike = (sel, at, o = {}) => {
    qa(sel).forEach(el => {
      const s = document.createElement('i');
      Object.assign(s.style, { position: 'absolute', left: '-2%', width: '104%', top: (o.top ?? 52) + '%', height: (o.h ?? 10) + '%', background: o.color || 'currentColor', transformOrigin: '0 50%', display: 'block' });
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(s);
      tl().fromTo(s, { scaleX: 0 }, { scaleX: 1, duration: o.dur ?? 0.32, ease: 'power3.inOut', immediateRender: true }, at);
    });
  };
  SW.count = (sel, at, from, to, o = {}) => MG.countUp(q(sel), at, from, to, o);
  // endless marquee rows: speed px/s, driven by frame time
  SW.marquee = (sel, speed, t0 = 0) => {
    qa(sel).forEach((row, i) => {
      const sp = Array.isArray(speed) ? speed[i % speed.length] : speed;
      MG.onFrame(t => { const w = row.scrollWidth / 2; const x = ((t - t0) * sp) % w; row.style.transform = `translateX(${sp > 0 ? -w + x : x}px)`; });
    });
  };
  SW.svg = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    (typeof parent === 'string' ? q(parent) : parent).appendChild(e);
    return e;
  };
  SW.draw = (el, at, dur = 0.6, ease = 'power2.inOut') => {
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len} ${len + 10}`;
    tl().fromTo(el, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease, immediateRender: true }, at);
  };
  window.SW = SW;
})();
