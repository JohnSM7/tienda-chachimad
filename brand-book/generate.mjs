// =====================================================
// Genera el brand book Madcry en PDF
// Genera:
//   - Madcry-Brand-Book.pdf (documento maestro completo)
//   - secciones individuales en /sections/
// =====================================================

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src', 'brand-book.html');
const DIST = path.join(__dirname, 'dist');
const SECTIONS_DIR = path.join(DIST, 'sections');

await fs.mkdir(DIST, { recursive: true });
await fs.mkdir(SECTIONS_DIR, { recursive: true });

const SECTIONS = [
  { idx: 0, slug: '00-cover', title: 'Cover' },
  { idx: 1, slug: '01-toc', title: 'Indice' },
  { idx: 2, slug: '02-manifiesto', title: 'Manifiesto' },
  { idx: 3, slug: '03-logo', title: 'Logo' },
  { idx: 4, slug: '04-donts', title: 'Que no hacer' },
  { idx: 5, slug: '05-color', title: 'Paleta de color' },
  { idx: 6, slug: '06-tipografia', title: 'Tipografia' },
  { idx: 7, slug: '07-tono-de-voz', title: 'Tono de voz' },
  { idx: 8, slug: '08-estilo-visual', title: 'Estilo visual' },
  { idx: 9, slug: '09-aplicaciones', title: 'Aplicaciones digitales' },
  { idx: 10, slug: '10-tarjeta-visita', title: 'Tarjeta de visita' },
  { idx: 11, slug: '11-packaging-redes', title: 'Packaging y redes' },
  { idx: 12, slug: '12-back-cover', title: 'Back cover' },
];

console.log('Lanzando Chromium headless...');
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const fileUrl = 'file:///' + SRC.replace(/\\/g, '/');

async function loadPage(url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 1754 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  // Esperar a que las fuentes esten cargadas
  await page.evaluateHandle('document.fonts.ready');
  return page;
}

const pdfOptions = {
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: true,
};

// 1) Documento completo
console.log('\n→ Generando brand book completo...');
{
  const page = await loadPage(fileUrl);
  const out = path.join(DIST, 'Madcry-Brand-Book.pdf');
  await page.pdf({ ...pdfOptions, path: out });
  await page.close();
  const size = (await fs.stat(out)).size;
  console.log(`  ✓ ${path.basename(out)} (${(size / 1024).toFixed(0)} KB)`);
}

// 2) Documentos individuales — generar ocultando el resto via CSS injection
console.log('\n→ Generando secciones individuales...');
for (const sec of SECTIONS) {
  const page = await loadPage(fileUrl);
  // Ocultar todas las secciones menos la deseada
  await page.addStyleTag({
    content: `.page { display: none !important; }
              .page:nth-of-type(${sec.idx + 1}) { display: flex !important; }`,
  });
  await page.evaluateHandle('document.fonts.ready');

  const out = path.join(SECTIONS_DIR, `${sec.slug}.pdf`);
  await page.pdf({ ...pdfOptions, path: out });
  await page.close();
  const size = (await fs.stat(out)).size;
  console.log(`  ✓ ${sec.slug}.pdf — ${sec.title} (${(size / 1024).toFixed(0)} KB)`);
}

await browser.close();
console.log('\nDone.');
console.log(`\nMaster: ${DIST}/Madcry-Brand-Book.pdf`);
console.log(`Sections: ${SECTIONS_DIR}/`);
