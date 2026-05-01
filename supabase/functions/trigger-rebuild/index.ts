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

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: 'Auth fallo' }, 401);
  }

  const githubToken = Deno.env.get('GITHUB_TOKEN');
  const githubRepo = Deno.env.get('GITHUB_REPO') ?? 'JohnSM7/tienda-chachimad';
  const workflow = Deno.env.get('GITHUB_WORKFLOW') ?? 'deploy.yml';

  if (!githubToken) {
    return jsonResponse(
      { error: 'GITHUB_TOKEN no configurado en Edge Function secrets' },
      500
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
    return jsonResponse({ error: 'GitHub dispatch fallo', detail: text }, res.status);
  }

  return jsonResponse({ ok: true, message: 'Rebuild disparado, listo en 2-3 min' });
});
