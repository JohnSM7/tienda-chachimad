-- =====================================================
-- Categories: control del menu publico desde el panel admin
-- =====================================================
-- Anade campos para que Susana decida que categorias aparecen
-- en el navbar (desktop + mobile), su orden y un badge opcional.
-- =====================================================

alter table public.categories
  add column if not exists show_in_menu boolean not null default false,
  add column if not exists menu_badge   text; -- ej "NEW" para badge rojo pulsante

-- Pre-populamos con las categorias que ya estaban hardcodeadas
update public.categories
set show_in_menu = true
where slug in ('madcry', 'one-piece', 'dragon-ball', 'jujutsu-kaisen', 'custom');

-- Madcry mantiene su badge "NEW"
update public.categories
set menu_badge = 'NEW'
where slug = 'madcry';

-- Aseguramos sort_order en linea con el orden que tenia el menu
update public.categories set sort_order = 1 where slug = 'madcry';
update public.categories set sort_order = 2 where slug = 'one-piece';
update public.categories set sort_order = 3 where slug = 'dragon-ball';
update public.categories set sort_order = 4 where slug = 'jujutsu-kaisen';
update public.categories set sort_order = 5 where slug = 'naruto';
update public.categories set sort_order = 6 where slug = 'custom';
update public.categories set sort_order = 7 where slug = 'otros';
