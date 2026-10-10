// Screenshot reference websites through the agent proxy.
// node snap.mjs outdir url1 url2 ...
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [out, ...urls] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY || 'http://127.0.0.1:37939' } });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36' });
for (const [i, u] of urls.entries()) {
  const page = await ctx.newPage();
  const name = String(i).padStart(2, '0') + '-' + u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
  try {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(out, name + '-a.png') });
    await page.mouse.wheel(0, 900); await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, name + '-b.png') });
    await page.mouse.wheel(0, 1400); await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, name + '-c.png') });
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    fs.writeFileSync(path.join(out, name + '.txt'), (await page.title()) + '\n' + txt);
    console.log('ok', u, await page.title());
  } catch (e) { console.log('fail', u, e.message.split('\n')[0]); }
  await page.close();
}
await browser.close();
