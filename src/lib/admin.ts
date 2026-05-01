/**
 * Helpers que SOLO usa el panel admin (Vue, en cliente, despues del login).
 * No exporta nada que requiera service_role — ese vive en Edge Functions.
 */
import { supabase, type Product, type ProductUpdate } from './supabase';

const ADMIN_EMAIL = 'info@madcry.com';

export function isAdmin(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

/**
 * Login con magic link. Susana introduce su email, Supabase le envia un
 * email con un enlace que la loguea. Sin contrasenas que perder.
 */
export async function signInWithMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/admin`
        : undefined,
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * Sube una imagen al bucket products/. Devuelve el path interno
 * (no URL completa) para guardarlo en images jsonb.
 */
export async function uploadProductImage(
  file: File,
  productSlug: string
): Promise<{ path: string; publicUrl: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filename = `${productSlug}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('products')
    .upload(filename, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('products').getPublicUrl(filename);
  return { path: filename, publicUrl: data.publicUrl };
}

export async function deleteProductImage(path: string) {
  // Solo borrar si es un path interno (no /images/legacy.jpg)
  if (path.startsWith('/') || path.startsWith('http')) return;
  return supabase.storage.from('products').remove([path]);
}

/**
 * Llama a la edge function admin-product-sync para crear o actualizar
 * un producto. La function se encarga de sincronizar con Stripe.
 */
export async function syncProduct(
  action: 'create' | 'update' | 'delete',
  payload: ProductUpdate & { id?: string }
) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('No autenticado');

  const url = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/admin-product-sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify({ action, product: payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}

/**
 * Trigger del rebuild de Firebase Hosting via GitHub workflow_dispatch.
 * Susana publica un cuadro nuevo -> click "Publicar" -> rebuild en 2-3 min.
 */
export async function triggerRebuild() {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('No autenticado');

  const url = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/trigger-rebuild`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.session.access_token}` },
  });

  if (!res.ok) throw new Error('Error al solicitar rebuild');
  return res.json();
}

export type { Product };
