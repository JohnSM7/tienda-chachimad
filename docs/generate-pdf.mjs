// Genera el PDF A4 del documento tecnico a partir del HTML.
// Salida: docs/exports/madcry-plataforma-tecnica.pdf
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'madcry-plataforma-tecnica.html');
const OUT_DIR = path.join(__dirname, 'exports');
const OUT = path.join(OUT_DIR, 'madcry-plataforma-tecnica.pdf');

await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();

await page.goto('file:///' + SRC.replace(/\\/g, '/'), {
  waitUntil: 'networkidle0',
  timeout: 90000,
});
await page.evaluateHandle('document.fonts.ready');

// Forzar colores impresos (CSP ya tiene print-color-adjust: exact)
await page.emulateMediaType('print');

await page.pdf({
  path: OUT,
  width: '794px',
  height: '1123px',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: false,
});

await browser.close();
const stat = await fs.stat(OUT);
console.log(`OK ${path.basename(OUT)} (${(stat.size / 1024).toFixed(0)} KB)`);
