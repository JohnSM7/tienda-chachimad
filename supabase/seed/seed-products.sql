-- =====================================================
-- SEED inicial: 16 productos existentes desde products.js
-- =====================================================
-- Este script es idempotente (usa ON CONFLICT DO NOTHING)
-- y NO crea nada en Stripe — el admin puede sincronizar
-- despues con la edge function admin-product-sync.
-- =====================================================

insert into public.products (
  slug, name, description, price_cents, category_slug,
  status, is_new, images, published_at
) values
  ('madcry-1', 'DROWNED IN MORALITY', 'Lanzamiento: 1 de Mayo', 15000, 'madcry',
   'available', true,
   '["/images/madcry-drowned.jpeg"]'::jsonb, now()),

  ('madcry-2', 'COMO UN NUDO EN LA GARGANTA', 'Lanzamiento: 1 de Mayo', 12000, 'madcry',
   'available', true,
   '["/images/madcry-nudo.jpeg"]'::jsonb, now()),

  ('madcry-3', 'LAST STRAWBERRY IN THE DESERT', 'Lanzamiento: 1 de Mayo', 12000, 'madcry',
   'available', true,
   '["/images/madcry-strawberry.jpeg"]'::jsonb, now()),

  ('madcry-4', '?', 'Lanzamiento: 1 de Mayo', 12000, 'madcry',
   'available', true,
   '["/images/madcry-mystery.jpeg"]'::jsonb, now()),

  ('madcry-5', 'DERRAME EMOCIONAL', 'Lanzamiento: 1 de Mayo', 12000, 'madcry',
   'available', true,
   '["/images/madcry-derrame.jpeg"]'::jsonb, now()),

  ('madcry-6', 'SOLO FUE DOPAMINA', 'Lanzamiento: 1 de Mayo', 12000, 'madcry',
   'available', true,
   '["/images/madcry-dopamina.jpeg"]'::jsonb, now()),

  ('madcry-7', 'DRENAJE DE MEMORIA', 'Lanzamiento: 1 de Mayo', 12000, 'madcry',
   'available', true,
   '["/images/madcry-drenaje.jpeg"]'::jsonb, now()),

  ('demo-1', 'Luffy Gangsta', 'Pieza unica de coleccion', 10000, 'one-piece',
   'available', false,
   '["/images/LuffyGang.jpeg"]'::jsonb, now()),

  ('demo-2', 'Lost in paradise', 'Pieza unica de coleccion', 5000, 'jujutsu-kaisen',
   'available', false,
   '["/images/lostinparadise.jpeg"]'::jsonb, now()),

  ('demo-3', 'Rinnengan', 'Pieza unica de coleccion', 4000, 'naruto',
   'available', false,
   '["/images/rinnengan.jpeg"]'::jsonb, now()),

  ('demo-4', 'Spiderman Brillante', 'Pieza unica de coleccion', 9000, 'otros',
   'sold', false,
   '["/images/spiderman.jpeg"]'::jsonb, now()),

  ('demo-5', 'One Piece Shadows', 'Pieza unica de coleccion', 7000, 'one-piece',
   'sold', false,
   '["/images/onepieceshadows.jpeg"]'::jsonb, now()),

  ('demo-6', 'Si era olor a gas', 'Pieza unica de coleccion', 10000, 'custom',
   'sold', false,
   '["/images/si-era-olor-a-gas.jpeg"]'::jsonb, now()),

  ('demo-7', 'Pinky Promise', 'Pieza unica de coleccion', 10000, 'custom',
   'sold', false,
   '["/images/pinkypromise.jpeg"]'::jsonb, now()),

  ('demo-8', 'Give a try', 'Pieza unica de coleccion', 10000, 'custom',
   'available', false,
   '["/images/giveatry.jpeg"]'::jsonb, now()),

  ('demo-9', 'Custom', 'Comision personalizada', 10000, 'custom',
   'available', false,
   '[]'::jsonb, now())

on conflict (slug) do nothing;
