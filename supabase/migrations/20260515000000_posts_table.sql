-- =====================================================
-- Posts (blog) editables desde el panel admin
-- =====================================================
-- Hasta ahora los posts vivian hardcoded en src/data/posts.js.
-- Esta migracion crea una tabla con RLS y migra los 4 posts
-- existentes para que Susana pueda editarlos desde /admin.
-- =====================================================

create type post_status as enum ('draft', 'published');

create table public.posts (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  title         text not null,
  excerpt       text,
  content       text not null default '',
  image         text,          -- path en bucket "posts" o URL externa
  category      text,          -- ej: "EVENTO", "BEHIND THE SCENES"
  status        post_status not null default 'draft',
  sort_order    int default 0,
  published_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index posts_status_idx on public.posts(status);
create index posts_published_at_idx on public.posts(published_at desc);

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table public.posts enable row level security;

-- Publico ve solo posts publicados
create policy "posts_public_read"
  on public.posts for select
  using (status = 'published');

-- Admin full access
create policy "posts_admin_all"
  on public.posts for all
  using (auth.jwt() ->> 'email' = 'info@madcry.com')
  with check (auth.jwt() ->> 'email' = 'info@madcry.com');

-- =====================================================
-- Vista publica con campos limitados (mismo patron que productos)
-- =====================================================
create view public.posts_public
with (security_invoker = on) as
  select id, slug, title, excerpt, content, image, category, published_at, sort_order
  from public.posts
  where status = 'published';

grant select on public.posts_public to anon, authenticated;

-- =====================================================
-- STORAGE: bucket para imagenes de blog
-- =====================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'posts',
  'posts',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do nothing;

create policy "posts_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'posts');

create policy "posts_storage_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'posts'
    and auth.jwt() ->> 'email' = 'info@madcry.com'
  );

create policy "posts_storage_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'posts'
    and auth.jwt() ->> 'email' = 'info@madcry.com'
  );

create policy "posts_storage_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'posts'
    and auth.jwt() ->> 'email' = 'info@madcry.com'
  );

-- =====================================================
-- Migracion de los 4 posts existentes (src/data/posts.js)
-- =====================================================
insert into public.posts (slug, title, excerpt, content, image, category, status, sort_order, published_at)
values
  (
    'exposicion-mena',
    'MADCRY: Exposición de Arte Urbano por Susana Madriz',
    'Descubre mi nueva colección de arte urbano en el Restaurante Mena Apulian Food durante todo el mes de mayo.',
    $html$<p>¡Por fin tenemos fecha para nuestro próximo evento! Es un tremendo orgullo anunciar mi nueva exposición individual.</p>
<p><strong>Susana Madriz</strong>, la mente y manos detrás de <strong>MADCRY</strong>, desvela su colección más reciente enfocada al 100% en el Arte Urbano más crudo, directo y visceral.</p>
<h3>Detalles de la Exposición</h3>
<ul>
  <li><strong>Lugar:</strong> Restaurante MENA - Apulian Food</li>
  <li><strong>Dirección:</strong> Calle Humilladero, 16. La Latina (Madrid)</li>
  <li><strong>Fechas:</strong> Desde el 01.05.26 al 31.05.26</li>
</ul>
<p>Durante todo un mes de infarto, el restaurante no solo te va a volar la cabeza con la mejor gastronomía italiana de tradición apuliana, sino que sus paredes estarán vestidas al completo por mi última colección. Ven a tomar algo, a probar su espectacular pasta y a sumergirte por completo en el oscuro, brillante y melancólico universo de Madcry en pleno corazón de La Latina.</p>
<p>¡Nos vemos allí! El acceso a la expo es totalmente libre reservando tu mesa en el restaurante o simplemente pasándote a tomar algo a la barra.</p>$html$,
    '/images/evento-mena.jpg',
    'EVENTO',
    'published',
    1,
    '2026-05-01T00:00:00+02:00'
  ),
  (
    'luffy-process',
    'El proceso detrás de ''Luffy Gangsta''',
    'Desde el boceto en sucio hasta los brillos en los dientes. Así creamos la pieza más vendida del mes.',
    $html$<p>Todo empezó con una idea simple: ¿Qué pasaría si el Rey de los Piratas viviera en el Bronx?</p>
<p>El proceso creativo duró aproximadamente 40 horas. Primero, realizamos un boceto a lápiz sobre un lienzo de gran formato (100x120cm). La clave de esta obra reside en la mezcla de técnicas: utilizamos acrílico para la base plana y spray para los degradados de la piel.</p>
<h3>El toque final: Brillos reales</h3>
<p>Para los dientes ("grills"), no queríamos usar pintura convencional. Utilizamos brillos para darle ese aspecto 'Gangsta' auténtico pero desgastado por la vida en el mar.</p>$html$,
    '/images/LuffyGang.jpeg',
    'BEHIND THE SCENES',
    'published',
    2,
    '2026-01-12T00:00:00+01:00'
  ),
  (
    'nuevos-materiales',
    'Nuevos materiales: Tinta Japonesa y Oro Líquido',
    'Explorando texturas que rompen la cuarta pared. La importancia de la materia prima en el arte urbano.',
    '<p>Aquí iría el contenido del segundo artículo...</p>',
    'https://imgs.search.brave.com/vYsN5gtifZJvlRrLUr_A_Y7BFsCGeabIpo6cQHGkRU0/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/c2lhbWdvZGguY29t/L3dwLWNvbnRlbnQv/dXBsb2Fkcy8yMDI0/LzAxL3RpbnRhLWNo/aW5hLXBpbnR1cmEt/bW9ub2Nyb21hdGlj/YS5qcGc',
    'MATERIALES',
    'published',
    3,
    '2026-01-05T00:00:00+01:00'
  ),
  (
    'colab-bleach-madcry',
    'Colaboración confirmada: Bleach x MadCry Studio',
    'Próximamente una serie limitada inspirada en los personajes de Bleach y la sociedad de almas.',
    '<p>Aquí iría el contenido del tercer artículo...</p>',
    'https://imgs.search.brave.com/KnzaSQ_H8WY1ixkjmMIwU7abMKC4Jqv8r3BF-o3Kv_c/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxscGFwZXJjYXZlLmNvbS93cC93cDEyOTIxODIyLnBuZw',
    'NEWS',
    'published',
    4,
    '2026-06-28T00:00:00+02:00'
  )
on conflict (slug) do nothing;
