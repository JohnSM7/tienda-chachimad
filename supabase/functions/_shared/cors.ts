// Headers CORS para edge functions.
// Solo permitimos los origenes del shop + dev local. Antes era '*',
// que dejaba a cualquier sitio invocar create-checkout-session y
// quemar cuota de Stripe/Resend desde dominios ajenos.

const ALLOWED_ORIGINS = [
  'https://madcry.com',
  'https://www.madcry.com',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
];

function pickOrigin(req: Request): string {
  const origin = req.headers.get('origin') ?? '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': pickOrigin(req),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  };
}

// Compat: algunas funciones importan corsHeaders directo. Mantenemos el
// nombre con headers genericos (sin Origin) para preflights sueltos.
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: buildCorsHeaders(req) });
  }
  return null;
}

export function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  const headers = req ? buildCorsHeaders(req) : corsHeaders;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
