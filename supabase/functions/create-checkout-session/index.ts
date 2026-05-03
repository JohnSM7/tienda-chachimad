// =====================================================
// create-checkout-session
// =====================================================
// Llamada por el boton "Comprar" en /product/[slug].
// 1. Lee el producto fresco de Supabase (precio actual).
// 2. Crea Stripe Checkout Session con price_data inline.
// 3. Devuelve la URL de checkout para redirigir al cliente.
//
// El precio NUNCA esta hard-codeado en Stripe — siempre viene
// de la BD en el momento del click. Susana puede editar precios
// sin tocar Stripe.
// =====================================================

import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, jsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-09-30.clover',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const SHOP_URL = Deno.env.get('SHOP_URL') ?? 'https://madcry.com';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { product_id } = await req.json();
    if (!product_id) {
      return jsonResponse({ error: 'Falta product_id' }, 400);
    }

    // 1. Lee producto fresco con flag hide_price de la categoria
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(hide_price)')
      .eq('id', product_id)
      .single();

    if (error || !product) {
      return jsonResponse({ error: 'Producto no encontrado' }, 404);
    }

    if (product.status !== 'available') {
      return jsonResponse({ error: 'Producto no disponible' }, 400);
    }

    // Las categorias con hide_price=true van por encargo (Commission):
    // se solicita presupuesto via /contact, no checkout online. Defensa
    // server-side aunque el HTML no muestre el boton.
    if ((product as any).categories?.hide_price) {
      return jsonResponse(
        { error: 'Esta pieza es por encargo. Solicita presupuesto en /contact.' },
        400
      );
    }

    // 2. Imagen principal absoluta para Stripe
    const firstImage = Array.isArray(product.images) && product.images.length > 0
      ? String(product.images[0])
      : null;
    const imageUrl = firstImage
      ? (firstImage.startsWith('http')
          ? firstImage
          : `${SHOP_URL}${firstImage.startsWith('/') ? '' : '/'}${firstImage}`)
      : undefined;

    // 3. Crear Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency || 'eur',
            unit_amount: product.price_cents,
            product_data: {
              name: product.name,
              description: product.description || undefined,
              images: imageUrl ? [imageUrl] : undefined,
              metadata: { product_id: product.id, slug: product.slug },
            },
          },
        },
      ],
      // Reservamos el producto durante el checkout — opcional, evita
      // que dos personas compren a la vez la misma pieza unica.
      metadata: {
        product_id: product.id,
        product_slug: product.slug,
      },
      // Datos de envio
      shipping_address_collection: {
        allowed_countries: ['ES', 'PT', 'FR', 'DE', 'IT', 'NL', 'BE', 'AT', 'IE'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1500, currency: 'eur' },
            display_name: 'Envio Espana',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 5 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 2500, currency: 'eur' },
            display_name: 'Envio resto UE',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      // Email autocomplete + factura
      phone_number_collection: { enabled: true },
      // Redirects
      success_url: `${SHOP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SHOP_URL}/product/${product.slug}`,
      // Expira en 30 min
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // 4. Pre-crear orden con status 'pending' (la confirma el webhook)
    await supabase.from('orders').insert({
      product_id: product.id,
      stripe_session_id: session.id,
      customer_email: 'pending@madcry.com',
      amount_total_cents: product.price_cents,
      currency: product.currency || 'eur',
      status: 'pending',
    });

    return jsonResponse({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return jsonResponse({ error: message }, 500);
  }
});
