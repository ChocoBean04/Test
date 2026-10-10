// Frame-accurate HTML -> MP4 renderer.
// The page must expose window.__ready (Promise), window.__duration (s) and window.__seek(t).
//
// node render.mjs page.html out.mp4 [--fps 60] [--workers 3] [--from 0] [--to dur]
// node render.mjs page.html --stills 1.5,8,20 --out dir     (PNG stills for QA)
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const html = path.resolve(args[0]);
const W = 1920, H = 1080;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto('file://' + html);
  await page.evaluate(() => window.__ready);
  return page;
}

async function stills(browser) {
  const out = path.resolve(opt('out', 'stills'));
  fs.mkdirSync(out, { recursive: true });
  const page = await openPage(browser);
  const ts = opt('stills').split(',').map(Number);
  for (const t of ts) {
    await page.evaluate(t => window.__seek(t), t);
    const f = path.join(out, `t${t.toFixed(2).padStart(7, '0')}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
}

function ffmpeg(out, fps) {
  return spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
}

async function renderChunk(browser, f0, f1, fps, out, label) {
  const page = await openPage(browser);
  const enc = ffmpeg(out, fps);
  const done = new Promise((res, rej) => enc.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.__seek(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    if ((f - f0) % 300 === 0) console.log(`[${label}] ${f - f0}/${f1 - f0} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  enc.stdin.end();
  await done;
  await page.close();
}

async function video(browser) {
  const out = path.resolve(args[1]);
  const fps = Number(opt('fps', 60));
  const workers = Number(opt('workers', 3));
  const probe = await openPage(browser);
  const dur = await probe.evaluate(() => window.__duration);
  await probe.close();
  const from = Number(opt('from', 0)), to = Number(opt('to', dur));
  const F0 = Math.round(from * fps), F1 = Math.round(to * fps);
  console.log(`duration ${dur.toFixed(2)}s -> frames ${F0}..${F1} @${fps}fps, ${workers} workers`);
  const per = Math.ceil((F1 - F0) / workers);
  const tmp = out + '.parts';
  fs.mkdirSync(tmp, { recursive: true });
  const parts = [];
  const jobs = [];
  for (let i = 0; i < workers; i++) {
    const a = F0 + i * per, b = Math.min(F1, a + per);
    if (a >= b) break;
    const p = path.join(tmp, `part${i}.mp4`);
    parts.push(p);
    jobs.push(renderChunk(browser, a, b, fps, p, 'w' + i));
  }
  await Promise.all(jobs);
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
    '-i', list, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' })
    .on('close', c => c === 0 ? res() : rej(new Error('concat ' + c))));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('wrote', out);
}

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
try {
  if (opt('stills')) await stills(browser); else await video(browser);
} finally {
  await browser.close();
}
