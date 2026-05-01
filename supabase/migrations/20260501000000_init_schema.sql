-- =====================================================
-- MADCRY STUDIO — schema inicial
-- =====================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- busqueda fuzzy en nombres

-- =====================================================
-- TABLA: categories
-- =====================================================
create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

insert into public.categories (slug, name, sort_order) values
  ('madcry',         'MadCry',          1),
  ('one-piece',      'One Piece',       2),
  ('dragon-ball',    'Dragon Ball',     3),
  ('jujutsu-kaisen', 'Jujutsu Kaisen',  4),
  ('naruto',         'Naruto',          5),
  ('custom',         'Custom',          6),
  ('otros',          'Otros',           7);

-- =====================================================
-- TABLA: products
-- =====================================================
create type product_status as enum ('available', 'reserved', 'sold', 'draft');

create table public.products (
  id                  uuid primary key default uuid_generate_v4(),
  slug                text unique not null,
  name                text not null,
  description         text,
  price_cents         int not null check (price_cents >= 0),
  currency            text not null default 'eur',
  category_slug       text references public.categories(slug) on delete set null,
  status              product_status not null default 'draft',
  is_new              boolean default false,
  -- Imagenes: la primera es la principal, resto galeria
  images              jsonb not null default '[]'::jsonb,
  -- Stripe
  stripe_product_id   text unique,
  stripe_price_id     text unique,
  stripe_payment_link text,
  -- Metadatos opcionales para piezas de arte
  dimensions          text,
  technique           text,
  year_created        int,
  -- Timestamps
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  published_at        timestamptz
);

create index products_status_idx on public.products(status);
create index products_category_idx on public.products(category_slug);
create index products_created_at_idx on public.products(created_at desc);
create index products_name_trgm_idx on public.products using gin(name gin_trgm_ops);

-- =====================================================
-- TABLA: orders
-- =====================================================
create type order_status as enum (
  'pending',     -- checkout iniciado, no pagado
  'paid',        -- pago confirmado por webhook
  'shipped',     -- enviado con tracking
  'delivered',   -- entregado
  'refunded',    -- reembolsado
  'failed',      -- pago fallo
  'cancelled'    -- cancelado
);

create table public.orders (
  id                      uuid primary key default uuid_generate_v4(),
  product_id              uuid references public.products(id) on delete restrict,
  -- Stripe
  stripe_session_id       text unique not null,
  stripe_payment_intent   text unique,
  -- Cliente
  customer_email          text not null,
  customer_name           text,
  customer_phone          text,
  shipping_address        jsonb,
  -- Importes (en centimos)
  amount_subtotal_cents   int,
  amount_shipping_cents   int default 0,
  amount_tax_cents        int default 0,
  amount_total_cents      int not null,
  currency                text not null default 'eur',
  -- Estado y logistica
  status                  order_status not null default 'pending',
  tracking_number         text,
  tracking_url            text,
  carrier                 text,
  notes                   text,
  -- Timestamps
  created_at              timestamptz default now(),
  paid_at                 timestamptz,
  shipped_at              timestamptz,
  delivered_at            timestamptz
);

create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_customer_email_idx on public.orders(customer_email);

-- =====================================================
-- TABLA: messages (formulario de contacto)
-- =====================================================
create type message_type as enum ('general', 'commission', 'collab');

create table public.messages (
  id          uuid primary key default uuid_generate_v4(),
  type        message_type not null default 'general',
  name        text not null,
  email       text not null,
  budget      text,
  message     text not null,
  read        boolean default false,
  replied     boolean default false,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz default now()
);

create index messages_created_at_idx on public.messages(created_at desc);
create index messages_unread_idx on public.messages(read) where read = false;

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas publicas
alter table public.products   enable row level security;
alter table public.orders     enable row level security;
alter table public.messages   enable row level security;
alter table public.categories enable row level security;

-- ----- categories: lectura publica, escritura solo admin -----
create policy "categories_public_read"
  on public.categories for select
  using (true);

create policy "categories_admin_write"
  on public.categories for all
  using (auth.jwt() ->> 'email' = 'info@madcry.com')
  with check (auth.jwt() ->> 'email' = 'info@madcry.com');

-- ----- products -----
-- Publico: ve productos con status != 'draft'
create policy "products_public_read"
  on public.products for select
  using (status <> 'draft');

-- Admin: full access
create policy "products_admin_all"
  on public.products for all
  using (auth.jwt() ->> 'email' = 'info@madcry.com')
  with check (auth.jwt() ->> 'email' = 'info@madcry.com');

-- ----- orders: SOLO admin (los pedidos son sensibles) -----
-- service_role bypass-ea RLS automaticamente, asi que webhook funciona
create policy "orders_admin_only"
  on public.orders for all
  using (auth.jwt() ->> 'email' = 'info@madcry.com')
  with check (auth.jwt() ->> 'email' = 'info@madcry.com');

-- ----- messages: cualquiera puede insertar, solo admin lee -----
create policy "messages_anyone_insert"
  on public.messages for insert
  with check (true);

create policy "messages_admin_read"
  on public.messages for select
  using (auth.jwt() ->> 'email' = 'info@madcry.com');

create policy "messages_admin_update"
  on public.messages for update
  using (auth.jwt() ->> 'email' = 'info@madcry.com');

-- =====================================================
-- VIEW publica con stock fresco (lo que consume el shop)
-- =====================================================
create view public.products_public as
  select
    id, slug, name, description, price_cents, currency,
    category_slug, status, is_new, images,
    stripe_payment_link, dimensions, technique, year_created,
    created_at, published_at
  from public.products
  where status <> 'draft';

grant select on public.products_public to anon, authenticated;

-- =====================================================
-- STORAGE: bucket de imagenes de producto
-- =====================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,                                   -- bucket publico (imagenes accesibles via CDN)
  10485760,                                -- 10MB max
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do nothing;

-- Storage policies
create policy "products_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "products_storage_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'products'
    and auth.jwt() ->> 'email' = 'info@madcry.com'
  );

create policy "products_storage_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'products'
    and auth.jwt() ->> 'email' = 'info@madcry.com'
  );

create policy "products_storage_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'products'
    and auth.jwt() ->> 'email' = 'info@madcry.com'
  );
