// =====================================================
// admin-product-sync
// =====================================================
// Susana usa el panel /admin para crear/editar/borrar cuadros.
// Esta funcion:
// 1. Verifica que el caller es admin (Susana).
// 2. Crea/actualiza el producto en Supabase.
// 3. Sincroniza nombre/descripcion/imagenes con Stripe Product
//    para reporting (precio NO va a Stripe — vive solo en BD).
// =====================================================

import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { requireAdmin, adminClient } from '../_shared/admin-auth.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-09-30.clover',
  httpClient: Stripe.createFetchHttpClient(),
});

const SHOP_URL = Deno.env.get('SHOP_URL') ?? 'https://madcry.com';

interface ProductPayload {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
  price_cents?: number;
  category_slug?: string;
  status?: 'available' | 'reserved' | 'sold' | 'draft';
  is_new?: boolean;
  images?: string[];
  dimensions?: string;
  technique?: string;
  year_created?: number;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: 'Auth fallo' }, 401);
  }

  const supabase = adminClient();

  try {
    const { action, product } = (await req.json()) as {
      action: 'create' | 'update' | 'delete';
      product: ProductPayload;
    };

    if (action === 'delete') {
      if (!product.id) return jsonResponse({ error: 'Falta id' }, 400);

      const { data: existing } = await supabase
        .from('products')
        .select('stripe_product_id, images')
        .eq('id', product.id)
        .single();

      // Soft-delete: marcar como draft (mantenemos historico para orders)
      await supabase
        .from('products')
        .update({ status: 'draft' })
        .eq('id', product.id);

      // Archivar en Stripe
      if (existing?.stripe_product_id) {
        await stripe.products
          .update(existing.stripe_product_id, { active: false })
          .catch((err) => console.warn('Stripe archive fallo:', err.message));
      }

      return jsonResponse({ ok: true });
    }

    if (action === 'create') {
      if (!product.name || !product.slug || product.price_cents === undefined) {
        return jsonResponse({ error: 'Faltan name, slug o price_cents' }, 400);
      }

      const imageUrls = absolutizeImages(product.images ?? []);

      // 1. Crear Stripe Product (sin Price — el precio viaja en cada Checkout Session)
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description || undefined,
        images: imageUrls.slice(0, 8),
        metadata: { slug: product.slug },
      });

      // 2. Insertar en BD
      const { data, error } = await supabase
        .from('products')
        .insert({
          slug: product.slug,
          name: product.name,
          description: product.description ?? null,
          price_cents: product.price_cents,
          category_slug: product.category_slug ?? null,
          status: product.status ?? 'draft',
          is_new: product.is_new ?? false,
          images: product.images ?? [],
          dimensions: product.dimensions ?? null,
          technique: product.technique ?? null,
          year_created: product.year_created ?? null,
          stripe_product_id: stripeProduct.id,
          published_at: product.status === 'available' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        // Rollback Stripe si falla la BD
        await stripe.products
          .update(stripeProduct.id, { active: false })
          .catch(() => {});
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse({ product: data });
    }

    if (action === 'update') {
      if (!product.id) return jsonResponse({ error: 'Falta id' }, 400);

      const { data: existing } = await supabase
        .from('products')
        .select('stripe_product_id, status')
        .eq('id', product.id)
        .single();

      const update: Record<string, unknown> = {};
      const stripeUpdate: Stripe.ProductUpdateParams = {};

      if (product.name !== undefined) {
        update.name = product.name;
        stripeUpdate.name = product.name;
      }
      if (product.description !== undefined) {
        update.description = product.description;
        stripeUpdate.description = product.description || undefined;
      }
      if (product.price_cents !== undefined) {
        // Precio: solo BD, NUNCA llega a Stripe
        update.price_cents = product.price_cents;
      }
      if (product.category_slug !== undefined) update.category_slug = product.category_slug;
      if (product.is_new !== undefined) update.is_new = product.is_new;
      if (product.dimensions !== undefined) update.dimensions = product.dimensions;
      if (product.technique !== undefined) update.technique = product.technique;
      if (product.year_created !== undefined) update.year_created = product.year_created;
      if (product.status !== undefined) {
        update.status = product.status;
        if (product.status === 'available' && existing?.status === 'draft') {
          update.published_at = new Date().toISOString();
        }
      }
      if (product.images !== undefined) {
        update.images = product.images;
        stripeUpdate.images = absolutizeImages(product.images).slice(0, 8);
      }

      const { data, error } = await supabase
        .from('products')
        .update(update)
        .eq('id', product.id)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);

      // Sync con Stripe (solo si hubo cambios relevantes para Stripe)
      if (existing?.stripe_product_id && Object.keys(stripeUpdate).length > 0) {
        await stripe.products
          .update(existing.stripe_product_id, stripeUpdate)
          .catch((err) => console.warn('Stripe update fallo:', err.message));
      }

      return jsonResponse({ product: data });
    }

    return jsonResponse({ error: 'Action invalida' }, 400);
  } catch (err) {
    console.error('admin-product-sync error:', err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return jsonResponse({ error: message }, 500);
  }
});

function absolutizeImages(images: unknown[]): string[] {
  return images
    .filter((s): s is string => typeof s === 'string')
    .map((s) => {
      if (s.startsWith('http')) return s;
      if (s.startsWith('/')) return `${SHOP_URL}${s}`;
      // path interno de bucket -> URL publica
      return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/products/${s}`;
    });
}
