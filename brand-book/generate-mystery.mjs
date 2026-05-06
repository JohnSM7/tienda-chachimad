// Genera la imagen "mystery" 1200x1200 que reemplaza al cuadro real
// mientras reveal_at no se haya cumplido. Sale a public/images/mystery-card.png.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src', 'mystery-card.html');
const OUT = path.join(__dirname, '..', 'public', 'images', 'mystery-card.png');

await fs.mkdir(path.dirname(OUT), { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 1 });
await page.goto('file:///' + SRC.replace(/\\/g, '/'), {
  waitUntil: 'networkidle0',
  timeout: 60000,
});
await page.evaluateHandle('document.fonts.ready');

await page.screenshot({
  path: OUT,
  type: 'png',
  clip: { x: 0, y: 0, width: 1200, height: 1200 },
});

await browser.close();
const stat = await fs.stat(OUT);
console.log(`OK ${path.basename(OUT)} (${(stat.size / 1024).toFixed(0)} KB)`);
