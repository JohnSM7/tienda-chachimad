-- =====================================================
-- Reveal dates: bloqueo de cuadros hasta una fecha
-- =====================================================
-- Susana quiere que los cuadros de la coleccion MADCRY no se vean
-- hasta el 13 de mayo de 2026 (fecha de la primera exposicion).
-- Hasta esa fecha, el shop muestra un placeholder con cuenta atras
-- pero la URL de la imagen real NUNCA llega al navegador.
--
-- Implementacion:
-- 1. Columna reveal_at en products (nullable: si no, sin bloqueo).
-- 2. La vista products_public enmascara imagenes / descripcion /
--    dimensiones / tecnica si reveal_at > now().
-- 3. Anade flag is_locked y reveal_at a la vista para que el cliente
--    pueda renderizar el placeholder y la cuenta atras.
-- =====================================================

alter table public.products
  add column if not exists reveal_at timestamptz;

create index if not exists products_reveal_at_idx
  on public.products(reveal_at)
  where reveal_at is not null;

-- Bloquea toda la coleccion MADCRY hasta el 13 de mayo a las 20:00
-- hora peninsular (CEST = UTC+2). Cambia la fecha si Susana decide
-- adelantar el evento — solo necesitas un update y un rebuild.
update public.products
set reveal_at = '2026-05-13 20:00:00+02'::timestamptz
where category_slug = 'madcry'
  and reveal_at is null;

-- =====================================================
-- VISTA products_public con enmascaramiento por reveal_at
-- =====================================================
drop view if exists public.products_public;

create view public.products_public as
  select
    p.id,
    p.slug,
    p.name,
    case
      when p.reveal_at is not null and p.reveal_at > now()
        then null
      else p.description
    end as description,
    p.price_cents,
    p.currency,
    p.category_slug,
    p.status,
    p.is_new,
    case
      when p.reveal_at is not null and p.reveal_at > now()
        then '[]'::jsonb
      else p.images
    end as images,
    p.stripe_payment_link,
    case
      when p.reveal_at is not null and p.reveal_at > now()
        then null
      else p.dimensions
    end as dimensions,
    case
      when p.reveal_at is not null and p.reveal_at > now()
        then null
      else p.technique
    end as technique,
    p.year_created,
    p.created_at,
    p.published_at,
    p.reveal_at,
    (p.reveal_at is not null and p.reveal_at > now()) as is_locked,
    c.price_label as category_price_label,
    c.default_description as category_default_description,
    c.hide_price as category_hide_price
  from public.products p
  left join public.categories c on c.slug = p.category_slug
  where p.status <> 'draft';

grant select on public.products_public to anon, authenticated;

-- =====================================================
-- DEFENSA SERVER-SIDE en create-checkout-session
-- =====================================================
-- La edge function ya valida status='available'. Anadimos defensa
-- de doble cinturon: si reveal_at todavia no ha pasado, no se debe
-- poder iniciar checkout. Lo hace la propia function leyendo el
-- campo reveal_at de la tabla products. Esta migracion solo asegura
-- que el campo existe; el codigo TS de la function lo lee aparte.
