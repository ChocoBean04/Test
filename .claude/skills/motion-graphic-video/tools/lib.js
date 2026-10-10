// Shared motion helpers on top of GSAP. One paused master timeline, seeked per frame by render.mjs.
// Every tween is fromTo() so any frame can be rendered out of order (parallel workers).
(function () {
  gsap.ticker.lagSmoothing(0);
  const tl = gsap.timeline({ paused: true });
  const frameHooks = [];
  const FPS = 60;

  function split(el) {
    if (el.__chars) return el.__chars;
    const out = [];
    (function walk(node) {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const c of n.textContent) {
            if (c === '\n') continue;
            const s = document.createElement('span');
            s.className = 'ch';
            s.textContent = c === ' ' ? ' ' : c;
            frag.appendChild(s);
            out.push(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    el.__chars = out;
    return out;
  }
  const $ = s => typeof s === 'string' ? [...document.querySelectorAll(s)] : (s instanceof Element ? [s] : [...s].flatMap(x => typeof x === 'string' ? [...document.querySelectorAll(x)] : [x]));
  const one = s => typeof s === 'string' ? document.querySelector(s) : s;

  // ---------- camera: evaluated analytically per frame (not a GSAP tween) so we know its velocity ----------
  const cam = {
    init: { x: 960, y: 540, s: 1, r: 0 },
    segs: [],
    state: null,
    start(st) { this.init = { ...this.init, ...st }; this.state = { ...this.init }; },
    to(st, at, dur, ease = 'power3.inOut') {
      const from = {};
      for (const k in st) from[k] = this.state[k];
      this.segs.push({ t0: at, t1: at + dur, from, to: st, ease: gsap.parseEase(ease) });
      Object.assign(this.state, st);
      tl.set({}, {}, at + dur); // extend timeline duration
    },
    eval(t) {
      const v = { ...this.init };
      for (const s of this.segs) {
        if (t < s.t0) continue;
        const p = t >= s.t1 ? 1 : s.ease((t - s.t0) / (s.t1 - s.t0));
        for (const k in s.to) v[k] = s.from[k] + (s.to[k] - s.from[k]) * p;
      }
      return v;
    },
    // gentle hand-held drift (sum of incommensurate sines), amplitude scaled by `shake`
    drift(t, amp = 1) {
      return {
        x: amp * (2.2 * Math.sin(t * 0.83 + 1.1) + 1.3 * Math.sin(t * 1.97 + 0.3) + 0.6 * Math.sin(t * 3.3)),
        y: amp * (1.8 * Math.sin(t * 0.71 + 2.0) + 1.1 * Math.sin(t * 1.53 + 4.1) + 0.5 * Math.sin(t * 2.9 + 1)),
        r: amp * (0.07 * Math.sin(t * 0.61 + 0.7) + 0.04 * Math.sin(t * 1.37 + 2.2)),
      };
    },
  };

  const look = { focus: 0, shake: 1, blurK: 0.42 };

  const MG = {
    tl, split, $, one, cam, look, FPS,
    onFrame: fn => frameHooks.push(fn),
    rect(el, root) { // element box in root's coordinate space (root must be untransformed while measuring)
      const a = one(el).getBoundingClientRect(), b = one(root).getBoundingClientRect();
      return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
    },
    rects(el, root) { // per-line boxes (for highlights over wrapped text)
      const b = one(root).getBoundingClientRect();
      return [...one(el).getClientRects()].map(a => ({ x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }));
    },
    vis(targets, at) { tl.fromTo($(targets), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: true }, at); },
    // masked line rise — targets are .ln wrappers
    rise(targets, at, o = {}) {
      const inner = $(targets).map(l => l.firstElementChild);
      tl.fromTo(inner, { yPercent: 115, rotate: o.rotate ?? 0 }, { yPercent: 0, rotate: 0, duration: o.dur ?? 1.1,
        ease: o.ease ?? 'expo.out', stagger: o.stagger ?? 0.12, immediateRender: true }, at);
    },
    // printed characters set one after another (typesetting)
    typeset(targets, at, o = {}) {
      let t = at;
      $(targets).forEach(el => {
        const ch = split(el);
        tl.fromTo(ch, { opacity: 0 }, { opacity: 1, duration: o.fade ?? 0.06, ease: 'none', stagger: o.each ?? 0.035, immediateRender: true }, t);
        t += ch.length * (o.each ?? 0.035) + (o.gap ?? 0.12);
      });
      return t;
    },
    // handwriting: wipe each line left→right at pen speed (chars per second)
    write(targets, at, o = {}) {
      let t = at;
      $(targets).forEach(el => {
        const n = [...el.textContent.replace(/\s/g, '')].length;
        const dur = o.dur ?? Math.max(0.35, n / (o.cps ?? 11));
        tl.fromTo(el, { clipPath: 'inset(-30% 101% -30% -4%)' }, { clipPath: 'inset(-30% -4% -30% -4%)', duration: dur,
          ease: o.ease ?? 'power1.inOut', immediateRender: true }, t);
        t += dur + (o.gap ?? 0.15);
      });
      return t;
    },
    fadeIn(targets, at, o = {}) {
      tl.fromTo($(targets), { opacity: 0, x: o.x ?? 0, y: o.y ?? 0, scale: o.scale ?? 1 },
        { opacity: 1, x: 0, y: 0, scale: 1, duration: o.dur ?? 0.8, ease: o.ease ?? 'power2.out', stagger: o.stagger ?? 0.1, immediateRender: true }, at);
    },
    // animate any numeric props of a plain object on the timeline
    tweenObj(obj, from, to, at, dur, ease = 'sine.inOut') {
      tl.fromTo(obj, { ...from }, { ...to, duration: dur, ease, immediateRender: false }, at);
    },
    countUp(el, at, from, to, o = {}) {
      const obj = { v: from };
      const fmt = o.fmt || (v => String(Math.round(v)));
      tl.fromTo(obj, { v: from }, { v: to, duration: o.dur ?? 1.4, ease: o.ease ?? 'power3.out', immediateRender: true,
        onUpdate: () => { one(el).textContent = fmt(obj.v); } }, at);
    },
  };

  async function ready() {
    const text = document.body.textContent;
    const fams = (document.documentElement.dataset.fonts || '').split('|').filter(Boolean);
    await Promise.all(fams.map(f => document.fonts.load(f, text)));
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  }
  window.MG = MG;
  window.__seek = t => { tl.seek(t, false); frameHooks.forEach(fn => fn(t)); };
  window.__ready = new Promise((res, rej) => {
    window.addEventListener('load', async () => {
      try {
        await ready();
        if (window.build) window.build(MG);
        window.__duration = tl.duration();
        window.__seek(0);
        res();
      } catch (e) { rej(e); }
    });
  });
})();
