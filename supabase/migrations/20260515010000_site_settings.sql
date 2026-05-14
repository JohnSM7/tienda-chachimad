-- =====================================================
-- Site settings — portada (home) editable desde el admin
-- =====================================================
-- Singleton: una sola fila con id='homepage'. Si en el futuro hay
-- otras secciones editables (sobre-nosotros, contacto hero, etc.)
-- se anaden filas con otros ids.
-- =====================================================

create table public.site_settings (
  id              text primary key,
  hero_image      text,           -- path bucket o URL absoluta
  eyebrow_text    text,           -- ej "Ya disponible" / "Coming Soon"
  eyebrow_color   text default 'green',  -- 'green' | 'red' | 'white'
  title           text,           -- ej "MADCRY"
  subtitle        text,           -- ej "Primera Coleccion"
  description     text,           -- texto descriptivo
  cta_label       text,           -- ej "Ver Coleccion →"
  cta_url         text,           -- ej "/shop?category=madcry"
  cta_note        text,           -- ej "Envio gratis a partir de 85 EUR"
  footer_top      text,           -- linea superior del footer hero
  footer_bottom   text,           -- linea inferior
  updated_at      timestamptz default now()
);

create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table public.site_settings enable row level security;

create policy "site_settings_public_read"
  on public.site_settings for select
  using (true);

create policy "site_settings_admin_write"
  on public.site_settings for all
  using (auth.jwt() ->> 'email' = 'info@madcry.com')
  with check (auth.jwt() ->> 'email' = 'info@madcry.com');

-- =====================================================
-- Seed con los valores actuales de la home
-- =====================================================
insert into public.site_settings (
  id,
  hero_image,
  eyebrow_text, eyebrow_color,
  title, subtitle,
  description,
  cta_label, cta_url, cta_note,
  footer_top, footer_bottom
) values (
  'homepage',
  '/images/evento-mena.jpg',
  'Ya disponible', 'green',
  'MADCRY', 'Primera Colección',
  'Piezas únicas (1/1) pintadas a mano · Disponibles online',
  'Ver Colección →', '/shop?category=madcry', 'Envío gratis a partir de 85 €',
  'MADCRY STUDIO', 'MENA - APULIAN FOOD'
)
on conflict (id) do nothing;
