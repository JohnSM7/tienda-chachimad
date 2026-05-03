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
import {
  renderEmail,
  renderDetailRows,
  formatPriceCents,
  escapeHtml,
} from '../_shared/email-template.ts';

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
    const orderShortId = session.id.slice(-8).toUpperCase();
    const totalStr = formatPriceCents(session.amount_total ?? 0, session.currency ?? 'eur');

    // ===== Email cliente =====
    const clientBody = `
      <p style="margin:0 0 16px 0;color:#bcbcbc;">Gracias por adquirir una pieza original de Madcry Studio.</p>
      <p style="margin:0 0 24px 0;color:#bcbcbc;">Tu obra <strong style="color:#ffffff;">${escapeHtml(product.name)}</strong> ya esta confirmada.</p>

      ${renderDetailRows([
        { label: 'Pieza', value: escapeHtml(product.name) },
        { label: 'Pedido', value: `#${orderShortId}` },
        { label: 'Total', value: `<strong>${totalStr}</strong>` },
      ])}

      <p style="margin:32px 0 8px 0;font-size:10px;letter-spacing:0.2em;color:#888888;text-transform:uppercase;font-weight:700;">Siguientes pasos</p>
      <ol style="margin:0;padding-left:20px;color:#bcbcbc;font-size:13px;line-height:1.9;">
        <li>Preparamos tu obra con embalaje de seguridad (24-48h).</li>
        <li>Recibiras un email con el numero de seguimiento.</li>
        <li>Entrega estimada: 3-5 dias laborables.</li>
      </ol>
    `;

    await resend.emails.send({
      from: 'Madcry Studio <pedidos@madcry.com>',
      to: customerEmail,
      replyTo: ADMIN_EMAIL,
      subject: `Pedido confirmado · ${product.name}`,
      html: renderEmail({
        preheader: `Tu pieza ${product.name} esta en camino. Total ${totalStr}.`,
        eyebrow: `Pedido #${orderShortId}`,
        heading: 'Pedido confirmado',
        bodyHtml: clientBody,
        cta: { label: 'Ver mi pedido', url: `${SHOP_URL}/product/${product.slug}` },
        footerNote: `Si tienes cualquier duda contactanos en cualquier momento. Las obras de Madcry son piezas unicas (1/1) pintadas a mano por Susana Madriz.`,
      }),
    }).catch(err => console.error('Email cliente fallo:', err));

    // ===== Email admin =====
    const shippingHtml = shipping
      ? `
        <p style="margin:24px 0 8px 0;font-size:10px;letter-spacing:0.2em;color:#888888;text-transform:uppercase;font-weight:700;">Envio a</p>
        <div style="background:#0f0f0f;border:1px solid #1f1f1f;padding:16px;color:#ffffff;font-size:13px;line-height:1.7;">
          ${escapeHtml(shipping.name ?? '')}<br>
          ${escapeHtml(shipping.address?.line1 ?? '')}<br>
          ${shipping.address?.line2 ? escapeHtml(shipping.address.line2) + '<br>' : ''}
          ${escapeHtml(shipping.address?.postal_code ?? '')} ${escapeHtml(shipping.address?.city ?? '')}<br>
          ${escapeHtml(shipping.address?.country ?? '')}
        </div>`
      : '';

    const adminBody = `
      <p style="margin:0 0 16px 0;color:#bcbcbc;">Nuevo pedido pagado en la tienda.</p>

      ${renderDetailRows([
        { label: 'Pieza', value: escapeHtml(product.name) },
        { label: 'Pedido', value: `#${orderShortId}` },
        { label: 'Total', value: `<strong>${totalStr}</strong>` },
        { label: 'Cliente', value: escapeHtml(session.customer_details?.name ?? '—') },
        { label: 'Email', value: `<a href="mailto:${escapeHtml(customerEmail)}" style="color:#ffffff;">${escapeHtml(customerEmail)}</a>` },
        { label: 'Telefono', value: escapeHtml(session.customer_details?.phone ?? '—') },
      ])}

      ${shippingHtml}
    `;

    await resend.emails.send({
      from: 'Madcry Pedidos <pedidos@madcry.com>',
      to: ADMIN_EMAIL,
      subject: `[VENTA] ${product.name} · ${totalStr}`,
      html: renderEmail({
        preheader: `Nuevo pedido: ${product.name} por ${totalStr}`,
        eyebrow: `VENTA #${orderShortId}`,
        heading: 'Nuevo pedido',
        bodyHtml: adminBody,
        cta: { label: 'Ir al panel', url: `${SHOP_URL}/admin` },
      }),
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
