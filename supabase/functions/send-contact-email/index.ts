// =====================================================
// send-contact-email
// =====================================================
// El formulario de /contact escribe en la tabla messages (RLS
// permite insert anon) y dispara esta function para enviar
// email al admin. Asi se sustituye FormSubmit por algo propio.
// =====================================================

import { Resend } from 'https://esm.sh/resend@4.0.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'info@madcry.com';

interface ContactPayload {
  type?: 'general' | 'commission' | 'collab';
  name: string;
  email: string;
  budget?: string;
  message: string;
  honeypot?: string;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = (await req.json()) as ContactPayload;

    // Honeypot — bots rellenan este campo, humanos no
    if (body.honeypot) {
      console.log('Honeypot triggered');
      return jsonResponse({ ok: true });   // mentimos al bot
    }

    if (!body.name || !body.email || !body.message) {
      return jsonResponse({ error: 'Campos obligatorios faltantes' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return jsonResponse({ error: 'Email invalido' }, 400);
    }
    if (body.message.length > 5000) {
      return jsonResponse({ error: 'Mensaje demasiado largo' }, 400);
    }

    // Rate limit basico — max 3 mensajes por email/IP en 1h
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('email', body.email)
      .gte('created_at', oneHourAgo);

    if ((count ?? 0) >= 3) {
      return jsonResponse({ error: 'Demasiados mensajes recientes' }, 429);
    }

    // Guardar en BD
    const { error: dbError } = await supabase.from('messages').insert({
      type: body.type ?? 'general',
      name: body.name.slice(0, 200),
      email: body.email.slice(0, 200),
      budget: body.budget?.slice(0, 100) ?? null,
      message: body.message,
      ip_address: ip,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    });
    if (dbError) {
      console.error('Insert messages fallo:', dbError);
      return jsonResponse({ error: 'Error guardando mensaje' }, 500);
    }

    // Email al admin
    const subject = `[Contacto - ${body.type ?? 'general'}] ${body.name}`;
    await resend.emails.send({
      from: 'Madcry Web <web@madcry.com>',
      to: ADMIN_EMAIL,
      replyTo: body.email,
      subject,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px;">
          <h2>Nuevo contacto desde la web</h2>
          <p><strong>Tipo:</strong> ${escapeHtml(body.type ?? 'general')}</p>
          <p><strong>Nombre:</strong> ${escapeHtml(body.name)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(body.email)}">${escapeHtml(body.email)}</a></p>
          ${body.budget ? `<p><strong>Presupuesto:</strong> ${escapeHtml(body.budget)}</p>` : ''}
          <p><strong>Mensaje:</strong></p>
          <blockquote style="border-left: 3px solid #000; padding-left: 12px; color: #333;">
            ${escapeHtml(body.message).replace(/\n/g, '<br>')}
          </blockquote>
        </div>
      `,
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('send-contact-email error:', err);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
