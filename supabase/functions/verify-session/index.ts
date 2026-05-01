// =====================================================
// verify-session
// =====================================================
// /success?session_id=cs_test_... llama aqui para confirmar
// que el session_id es valido y esta pagado, antes de mostrar
// la pagina de "pedido confirmado". Asi nadie puede entrar
// a /success?session_id=fake y ver una pagina falsa.
// =====================================================

import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-09-30.clover',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return jsonResponse({ error: 'session_id invalido' }, 400);
    }

    // 1. Verificar contra Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === 'paid' || session.payment_status === 'no_payment_required';

    if (!paid) {
      return jsonResponse({ paid: false, status: session.payment_status }, 200);
    }

    // 2. Buscar el pedido y producto en BD
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, amount_total_cents, currency, product_id, products(name, slug, images)')
      .eq('stripe_session_id', sessionId)
      .single();

    return jsonResponse({
      paid: true,
      order_id: order?.id ?? null,
      product: order?.products ?? null,
      total_cents: order?.amount_total_cents ?? session.amount_total,
      currency: order?.currency ?? session.currency,
      customer_email: session.customer_details?.email ?? null,
    });
  } catch (err) {
    console.error('verify-session error:', err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return jsonResponse({ error: message }, 500);
  }
});
