// Mide el contenido REAL dentro de cada .page (page-body / cover)
// y compara con la altura disponible (1123 - strip - footer).
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'madcry-plataforma-tecnica.html');

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 794, height: 1123 });
await page.goto('file:///' + SRC.replace(/\\/g, '/'), {
  waitUntil: 'networkidle0',
});
await page.evaluateHandle('document.fonts.ready');

const overflows = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('.page').forEach((el, i) => {
    // Sumamos altura de hijos directos: page-strip + page-body + page-footer
    const strip = el.querySelector('.page-strip');
    const body = el.querySelector('.page-body');
    const footer = el.querySelector('.page-footer');
    const cover = el.querySelector('[class^="cover-"]');

    let realContent = 0;
    if (cover) {
      realContent = cover.scrollHeight;
    } else if (body) {
      realContent = (strip ? strip.offsetHeight : 0) + body.scrollHeight + 70;
    }

    results.push({
      idx: i + 1,
      contentHeight: Math.round(realContent),
      excess: Math.max(0, realContent - 1123),
      tipo: cover ? cover.className.split(' ').find((c) => c.startsWith('cover-')) : 'page-body',
    });
  });
  return results;
});

console.table(overflows);
const overflowing = overflows.filter((r) => r.excess > 0);
if (overflowing.length === 0) {
  console.log('OK · ninguna pagina excede 1123px');
} else {
  console.log(`Aviso · ${overflowing.length} pagina(s) con desbordamiento real`);
}
await browser.close();
