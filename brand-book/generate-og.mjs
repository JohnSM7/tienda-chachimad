// Genera la imagen OG (Open Graph / Twitter card) 1200x630 a partir
// del template HTML. Sale a public/images/og-banner.png para que el
// Layout.astro la sirva como og:image / twitter:image.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src', 'og-image.html');
const OUT = path.join(__dirname, '..', 'public', 'images', 'og-banner.png');

await fs.mkdir(path.dirname(OUT), { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.goto('file:///' + SRC.replace(/\\/g, '/'), {
  waitUntil: 'networkidle0',
  timeout: 60000,
});
await page.evaluateHandle('document.fonts.ready');

await page.screenshot({
  path: OUT,
  type: 'png',
  clip: { x: 0, y: 0, width: 1200, height: 630 },
  omitBackground: false,
});

await browser.close();
const size = (await fs.stat(OUT)).size;
console.log(`OK ${path.basename(OUT)} (${(size / 1024).toFixed(0)} KB)`);
