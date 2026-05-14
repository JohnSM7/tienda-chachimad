import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Faltan variables de entorno: PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Cliente Supabase para uso publico (anon key).
 * - Respeta RLS: solo ve productos no-draft, no puede leer orders.
 * - Sirve tanto en build (Astro getStaticPaths) como en cliente (Vue admin).
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
      detectSessionInUrl: typeof window !== 'undefined',
    },
  }
);

/**
 * Devuelve la URL publica de un asset del bucket "products".
 * Si la ruta ya es absoluta (legacy /images/foo.jpg) la deja igual.
 */
export function getProductImageUrl(path: string | null | undefined): string {
  if (!path) return '/images/logo.png';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const { data } = supabase.storage.from('products').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Como getProductImageUrl pero para el bucket "posts" (blog).
 */
export function getPostImageUrl(path: string | null | undefined): string {
  if (!path) return '/images/logo.png';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const { data } = supabase.storage.from('posts').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Formatea precio en centimos a string EUR.
 */
export function formatPrice(cents: number, currency = 'eur'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Tipo extendido para la vista products_public — anade campos que la
 * vista calcula y que no estan en la tabla base (reveal_at, is_locked,
 * categorias). Mantenemos una sola fuente de verdad para el shop.
 */
export type PublicProduct = Database['public']['Tables']['products']['Row'] & {
  reveal_at: string | null;
  is_locked: boolean;
  category_price_label: string | null;
  category_default_description: string | null;
  category_hide_price: boolean | null;
};

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];

/**
 * Configuracion editable del sitio (portada, etc.). Singleton con
 * id='homepage'. Si el id no existe, fallback a valores por defecto.
 */
export interface SiteSettings {
  id: string;
  hero_image: string | null;
  eyebrow_text: string | null;
  eyebrow_color: 'green' | 'red' | 'white' | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  cta_label: string | null;
  cta_url: string | null;
  cta_note: string | null;
  footer_top: string | null;
  footer_bottom: string | null;
  updated_at: string;
}

/**
 * Posts del blog — la tabla aun no esta en database.types.ts (se
 * regenera con `supabase gen types`). Mientras, tipo manual.
 */
export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  image: string | null;
  category: string | null;
  status: 'draft' | 'published';
  sort_order: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
