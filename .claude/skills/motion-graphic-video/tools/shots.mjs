// Screenshot each <section id> of a static page: node shots.mjs page.html outdir
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [page, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + path.resolve(page));
await p.evaluate(async () => {
  const text = document.body.textContent;
  const extra = (document.documentElement.dataset.fonts || '').split('|').filter(Boolean);
  const fams = [...extra, '900 40px "Noto Sans SC"', '900 40px "Noto Sans TC"', '400 40px "JetBrains Mono"', 'italic 40px "Instrument Serif"', '600 40px "Noto Serif SC"', '900 40px "Archivo"'];
  await Promise.all(fams.map(f => document.fonts.load(f, text)));
  await document.fonts.ready;
});
for (const el of await p.$$('section[id]')) {
  const id = await el.getAttribute('id');
  await el.screenshot({ path: path.join(out, id + '.png') });
  console.log(id);
}
await b.close();
