// =====================================================
// stripe-webhook
// =====================================================
// Recibe eventos de Stripe (checkout.session.completed, etc).
// Verifica firma para evitar suplantacion. Marca pedidos como
// pagados y el producto como "sold". Envia email de confirmacion.
//
// IMPORTANTE: configurar verify_jwt=false en config.toml — Stripe
// no envia JWT de Supabase, autenticamos por la firma webhook.
// =====================================================

import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-09-30.clover',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'info@madcry.com';
const SHOP_URL = Deno.env.get('SHOP_URL') ?? 'https://madcry.com';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  console.log(`Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      default:
        console.log(`Evento sin handler: ${event.type}`);
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Handler error', { status: 500 });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const productId = session.metadata?.product_id;
  if (!productId) {
    console.warn('checkout.session.completed sin product_id en metadata');
    return;
  }

  // 1. Actualizar el pedido con datos reales del cliente
  const shipping = session.shipping_details ?? null;
  const customerEmail =
    session.customer_details?.email || session.customer_email || 'unknown@madcry.com';

  await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent: session.payment_intent as string | null,
      customer_email: customerEmail,
      customer_name: session.customer_details?.name ?? null,
      customer_phone: session.customer_details?.phone ?? null,
      shipping_address: shipping ? {
        name: shipping.name,
        line1: shipping.address?.line1,
        line2: shipping.address?.line2,
        city: shipping.address?.city,
        postal_code: shipping.address?.postal_code,
        state: shipping.address?.state,
        country: shipping.address?.country,
      } : null,
      amount_subtotal_cents: session.amount_subtotal ?? null,
      amount_shipping_cents: session.shipping_cost?.amount_total ?? 0,
      amount_tax_cents: session.total_details?.amount_tax ?? 0,
      amount_total_cents: session.amount_total ?? 0,
    })
    .eq('stripe_session_id', session.id);

  // 2. Marcar producto como vendido (es pieza unica 1/1)
  await supabase
    .from('products')
    .update({ status: 'sold' })
    .eq('id', productId);

  // 3. Email al admin (Susana) y al cliente
  const { data: product } = await supabase
    .from('products')
    .select('name, slug, price_cents')
    .eq('id', productId)
    .single();

  if (product) {
    const eur = (cents: number) => `${(cents / 100).toFixed(2)}€`;
    const total = eur(session.amount_total ?? 0);

    // Email cliente
    await resend.emails.send({
      from: 'Madcry Studio <pedidos@madcry.com>',
      to: customerEmail,
      replyTo: ADMIN_EMAIL,
      subject: `Pedido confirmado: ${product.name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="text-transform: uppercase; letter-spacing: 0.1em;">Pedido confirmado</h1>
          <p>Gracias por adquirir una pieza original de Madcry Studio.</p>
          <h2 style="border-top: 1px solid #ccc; padding-top: 20px;">${product.name}</h2>
          <p><strong>Total:</strong> ${total}</p>
          <p>Tu pieza estara lista para envio en 24-48h. Recibiras otro email con el numero de seguimiento.</p>
          <p style="font-size: 11px; color: #888; margin-top: 40px;">
            Si tienes cualquier duda escribenos a ${ADMIN_EMAIL}.
          </p>
        </div>
      `,
    }).catch(err => console.error('Email cliente fallo:', err));

    // Email admin
    await resend.emails.send({
      from: 'Madcry Pedidos <pedidos@madcry.com>',
      to: ADMIN_EMAIL,
      subject: `[VENTA] ${product.name} - ${total}`,
      html: `
        <h2>Nuevo pedido pagado</h2>
        <p><strong>Pieza:</strong> ${product.name}</p>
        <p><strong>Total:</strong> ${total}</p>
        <p><strong>Cliente:</strong> ${session.customer_details?.name ?? '-'} &lt;${customerEmail}&gt;</p>
        <p><strong>Telefono:</strong> ${session.customer_details?.phone ?? '-'}</p>
        ${shipping ? `
        <p><strong>Envio a:</strong><br>
          ${shipping.name}<br>
          ${shipping.address?.line1 ?? ''}<br>
          ${shipping.address?.line2 ? shipping.address.line2 + '<br>' : ''}
          ${shipping.address?.postal_code ?? ''} ${shipping.address?.city ?? ''}<br>
          ${shipping.address?.country ?? ''}
        </p>
        ` : ''}
        <p><a href="${SHOP_URL}/admin">Ir al panel</a></p>
      `,
    }).catch(err => console.error('Email admin fallo:', err));
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('stripe_session_id', session.id);
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;
  const { data: order } = await supabase
    .from('orders')
    .select('id, product_id')
    .eq('stripe_payment_intent', charge.payment_intent as string)
    .single();

  if (order) {
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', order.id);
    // Volver a poner el cuadro como disponible
    if (order.product_id) {
      await supabase
        .from('products')
        .update({ status: 'available' })
        .eq('id', order.product_id);
    }
  }
}
