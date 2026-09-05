-- Run these checks as the project owner after database-setup.sql.

-- The public prayer table must have RLS enabled.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where oid in ('public.prayer_requests'::regclass, 'public.ministry_members'::regclass);

-- Verify the intended Data API grants (no public reads or destructive writes).
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'prayer_requests'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- Verify that every required request policy is present.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'prayer_requests'
order by policyname;
