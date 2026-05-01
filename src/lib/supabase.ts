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
 * Formatea precio en centimos a string EUR.
 */
export function formatPrice(cents: number, currency = 'eur'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
