// Genera un QR personalizado por cada pieza MADCRY apuntando a su URL
// publica. Lee productos de la BD (categoria=madcry, no draft), crea
// un QR con error correction High (permite logo central sin romper
// la decodificacion) y lo compone con la plantilla de marca.
//
// Salida: brand-book/dist/qr/<slug>.png
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TEMPLATE = path.join(__dirname, 'src', 'qr-template.html');
const OUT_DIR = path.join(__dirname, 'dist', 'qr');
const LOGO_PATH = path.join(ROOT, 'public', 'images', 'logo.png');
const SHOP_URL = process.env.SHOP_URL ?? 'https://madcry.com';

// ---------- 1) Carga env vars ----------
async function loadEnvLocal() {
  try {
    const raw = await fs.readFile(path.join(ROOT, '.env.local'), 'utf8');
    raw.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx < 0) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    });
  } catch {
    // ok si no hay .env.local
  }
}
await loadEnvLocal();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

// ---------- 2) Logo a data URL ----------
const logoBuffer = await fs.readFile(LOGO_PATH);
const logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;

// ---------- 3) Productos a generar ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { data: products, error } = await supabase
  .from('products_public')
  .select('slug, name, category_slug')
  .eq('category_slug', 'madcry')
  .order('slug');

if (error) {
  console.error('Error leyendo productos:', error.message);
  process.exit(1);
}
if (!products?.length) {
  console.warn('Sin piezas MADCRY en BD. Nada que generar.');
  process.exit(0);
}

console.log(`Generando ${products.length} QR(s)...`);

// ---------- 4) Template ----------
const template = await fs.readFile(TEMPLATE, 'utf8');
await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 1000, deviceScaleFactor: 2 });

const dateStr = new Date().toLocaleDateString('es-ES', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

for (const product of products) {
  const url = `${SHOP_URL}/product/${product.slug}`;

  // Error correction H (~30%) → permite tapar centro con logo sin romper QR
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 1100,
    margin: 0,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const html = template
    .replace('{{NAME}}', product.name)
    .replace('{{SLUG}}', product.slug)
    .replace('{{QR}}', qrDataUrl)
    .replace('{{LOGO_DATA_URL}}', logoDataUrl)
    .replace('{{COLLECTION}}', 'COLECCION MADCRY')
    .replace('{{DATE}}', dateStr);

  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  // Espera hasta que la fuente este cargada y los <img> renderizados
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? null
          : new Promise((res) => {
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', res, { once: true });
            })
      )
    );
  });

  const out = path.join(OUT_DIR, `${product.slug}.png`);
  await page.screenshot({
    path: out,
    type: 'png',
    clip: { x: 0, y: 0, width: 800, height: 1000 },
  });
  console.log(`  ✓ ${product.slug}.png`);
}

await browser.close();
console.log(`\nListo. ${products.length} QR(s) en ${OUT_DIR}`);
