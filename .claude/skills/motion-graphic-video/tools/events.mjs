// Dump a page's timeline duration and sound events: node events.mjs page.html out.json
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [page, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.error('pageerror:', e.message));
await p.goto('file://' + path.resolve(page));
await p.evaluate(() => window.__ready);
const data = await p.evaluate(() => ({ duration: window.__duration, sfx: window.__sfx || [] }));
fs.writeFileSync(out, JSON.stringify(data, null, 1));
const kinds = {};
data.sfx.forEach(e => { kinds[e.kind] = (kinds[e.kind] || 0) + 1; });
console.log('duration', data.duration.toFixed(2), 'events', data.sfx.length, JSON.stringify(kinds));
await b.close();
