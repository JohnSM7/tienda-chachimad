-- =====================================================
-- Fix: Security Definer View warning
-- =====================================================
-- Por defecto las vistas en Postgres se ejecutan con privilegios
-- del owner (Security Definer), saltandose RLS. Con security_invoker
-- se ejecutan con los privilegios del usuario que las consulta —
-- mas seguro y respeta las policies de la tabla subyacente.
--
-- products_public expone solo no-drafts y la tabla products tiene
-- policy "products_public_read" que permite anon leer no-drafts,
-- asi que el cambio es funcionalmente idempotente y mas correcto
-- desde el punto de vista de seguridad.
-- =====================================================

alter view public.products_public set (security_invoker = on);
