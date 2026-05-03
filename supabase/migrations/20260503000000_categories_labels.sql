-- =====================================================
-- Categorias: campos personalizables para el admin
-- =====================================================
-- price_label: lo que se muestra en lugar del precio (ej "Commission")
-- default_description: fallback cuando el producto no tiene description
-- hide_price: oculta el precio en la tienda y deshabilita el checkout
-- =====================================================

alter table public.categories
  add column if not exists price_label text,
  add column if not exists default_description text,
  add column if not exists hide_price boolean not null default false;

-- Por defecto la categoria custom oculta precio y muestra "Commission"
update public.categories set
  price_label = 'Commission',
  default_description = 'Pieza unica de Commission.',
  hide_price = true
where slug = 'custom';

-- View ampliada con campos de la categoria
drop view if exists public.products_public;
create view public.products_public as
  select
    p.id, p.slug, p.name, p.description, p.price_cents, p.currency,
    p.category_slug, p.status, p.is_new, p.images,
    p.stripe_payment_link, p.dimensions, p.technique, p.year_created,
    p.created_at, p.published_at,
    c.price_label as category_price_label,
    c.default_description as category_default_description,
    c.hide_price as category_hide_price
  from public.products p
  left join public.categories c on c.slug = p.category_slug
  where p.status <> 'draft';

grant select on public.products_public to anon, authenticated;
