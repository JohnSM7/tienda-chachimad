// =====================================================
// trigger-rebuild
// =====================================================
// Susana publica un cuadro nuevo -> click "Publicar" -> esta
// funcion dispara workflow_dispatch en GitHub que rebuilda el
// sitio Astro y deploya a Firebase Hosting (~2-3 min).
//
// Para cambios de status (sold/available) NO hace falta — eso se
// fetchea client-side en el shop sin rebuild.
// =====================================================

import { requireAdmin } from '../_shared/admin-auth.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

// Throttle in-memory: si la edge function recibe dos clicks seguidos
// (panel pegado, doble-click, retry de fetch...), evitamos disparar
// dos workflows GitHub. La memoria se resetea con cada cold-start,
// pero eso ya nos protege del 99% de los casos.
const THROTTLE_SECONDS = 60;
let lastDispatchAt = 0;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: 'Auth fallo' }, 401, req);
  }

  const now = Date.now();
  const elapsed = (now - lastDispatchAt) / 1000;
  if (elapsed < THROTTLE_SECONDS) {
    const wait = Math.ceil(THROTTLE_SECONDS - elapsed);
    return jsonResponse(
      { error: `Espera ${wait}s antes del proximo rebuild`, retry_after: wait },
      429,
      req
    );
  }

  const githubToken = Deno.env.get('GITHUB_TOKEN');
  const githubRepo = Deno.env.get('GITHUB_REPO') ?? 'JohnSM7/tienda-chachimad';
  const workflow = Deno.env.get('GITHUB_WORKFLOW') ?? 'deploy.yml';

  if (!githubToken) {
    return jsonResponse(
      { error: 'GITHUB_TOKEN no configurado en Edge Function secrets' },
      500,
      req
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${githubRepo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'madcry-admin',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('GitHub dispatch fallo:', res.status, text);
    return jsonResponse({ error: 'GitHub dispatch fallo', detail: text }, res.status, req);
  }

  lastDispatchAt = now;
  return jsonResponse({ ok: true, message: 'Rebuild disparado, listo en 2-3 min' }, 200, req);
});
