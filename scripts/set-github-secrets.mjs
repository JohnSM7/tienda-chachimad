#!/usr/bin/env node
// Crea/actualiza secrets en GitHub Actions usando la API.
// Lee credenciales de .env.local y las cifra con libsodium sealed box.

import sodium from 'libsodium-wrappers';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const GH_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GH_REPO || 'JohnSM7/tienda-chachimad';
if (!GH_TOKEN) {
  console.error('Falta GH_TOKEN en env');
  process.exit(1);
}

await sodium.ready;

async function api(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

const { key, key_id } = await api('GET', `/repos/${REPO}/actions/secrets/public-key`);
console.log('Public key obtenida.');

function encrypt(value) {
  const pubKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const msg = sodium.from_string(value);
  const sealed = sodium.crypto_box_seal(msg, pubKey);
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

async function setSecret(name, value) {
  if (!value) {
    console.warn(`  · ${name}: SKIP (vacio)`);
    return;
  }
  const encrypted_value = encrypt(value);
  await api('PUT', `/repos/${REPO}/actions/secrets/${name}`, {
    encrypted_value,
    key_id,
  });
  console.log(`  ✓ ${name}`);
}

console.log(`Creando secrets en ${REPO}:`);
await setSecret('PUBLIC_SUPABASE_URL', env.PUBLIC_SUPABASE_URL);
await setSecret('PUBLIC_SUPABASE_ANON_KEY', env.PUBLIC_SUPABASE_ANON_KEY);
await setSecret('PUBLIC_STRIPE_PUBLISHABLE_KEY', env.PUBLIC_STRIPE_PUBLISHABLE_KEY);

if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  const json = readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
  await setSecret('FIREBASE_SERVICE_ACCOUNT', json);
}

console.log('\nDone.');
