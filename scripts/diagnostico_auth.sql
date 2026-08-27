-- Diagnostico de autenticacao/autorizacao
-- Execute no SQL Editor do Supabase.

-- 1) Integridade de vinculo usuario <-> membro
-- 1.1 Usuarios auth sem membro vinculado
select
    u.id as auth_user_id,
    u.email,
    u.created_at
from auth.users u
left join public.membros m on m.user_id = u.id
where m.id is null
order by u.created_at desc;

-- 1.2 Membros com user_id duplicado (nao deveria existir)
select
    m.user_id,
    count(*) as total
from public.membros m
where m.user_id is not null
group by m.user_id
having count(*) > 1;

-- 1.3 Membros sem perfil
select
    m.id as membro_id,
    m.nome_completo,
    m.user_id
from public.membros m
left join public.membro_perfis mp on mp.membro_id = m.id
where m.user_id is not null
group by m.id, m.nome_completo, m.user_id
having count(mp.id) = 0
order by m.nome_completo;

-- 1.4 Perfis apontando para membro inexistente (na pratica nao deveria ocorrer por FK)
select
    mp.*
from public.membro_perfis mp
left join public.membros m on m.id = mp.membro_id
where m.id is null;

-- 2) RLS/policies nas tabelas de auth de app
select
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('membros', 'membro_perfis', 'eventos')
order by tablename, policyname;

-- 3) Grants efetivos para anon/authenticated
select
    table_schema,
    table_name,
    privilege_type,
    grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('membros', 'membro_perfis', 'eventos')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 4) Validacao pontual por email
-- Substitua o email abaixo antes de executar.
with target_user as (
    select id, email
    from auth.users
    where email = 'COLOQUE_O_EMAIL_AQUI'
),
target_membro as (
    select m.*
    from public.membros m
    join target_user u on u.id = m.user_id
),
target_roles as (
    select mp.*
    from public.membro_perfis mp
    join target_membro tm on tm.id = mp.membro_id
)
select
    'user' as tipo,
    row_to_json(u)::text as payload
from target_user u
union all
select
    'membro' as tipo,
    row_to_json(tm)::text as payload
from target_membro tm
union all
select
    'role' as tipo,
    row_to_json(tr)::text as payload
from target_roles tr;
