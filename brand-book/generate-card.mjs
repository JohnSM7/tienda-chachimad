// Genera la tarjeta de visita en formato imprenta (con sangrado 3mm)
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src', 'business-card-print.html');
const OUT = path.join(__dirname, 'dist', 'Madcry-Business-Card-Print.pdf');

await fs.mkdir(path.dirname(OUT), { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.goto('file:///' + SRC.replace(/\\/g, '/'), {
  waitUntil: 'networkidle0',
  timeout: 60000,
});
await page.evaluateHandle('document.fonts.ready');

await page.pdf({
  path: OUT,
  width: '91mm',
  height: '61mm',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: true,
});

await browser.close();
const size = (await fs.stat(OUT)).size;
console.log(`✓ ${path.basename(OUT)} (${(size / 1024).toFixed(0)} KB)`);
