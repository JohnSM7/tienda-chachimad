import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'info@madcry.com';

/**
 * Valida que el caller esta autenticado y es el admin (Susana).
 * Devuelve el user si OK, lanza Response 401/403 si no.
 */
export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Sin token' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'Token invalido' }), {
      status: 401,
    });
  }

  if (data.user.email !== ADMIN_EMAIL) {
    throw new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
    });
  }

  return data.user;
}

/**
 * Cliente admin con service_role — bypass de RLS, solo usar tras requireAdmin().
 */
export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}
