# Resumo (2026-02-06)

## Contexto
- Problema: app fica em "Carregando..." e/ou perde conexao com o banco.
- O problema ficou mais evidente depois da separacao de logins/roles.

## Evidencias do banco (SQLs do usuario)
- `membros.user_id` sem duplicidade.
- RLS habilitado com politicas permissivas para `authenticated` em tabelas criticas.
- Grants para `authenticated` presentes nas tabelas usadas.

## Diagnostico atual (mais provavel)
- Falhas de sessao/auth no client (expiracao, inconsistencia de cookies).
- Chamadas ao Supabase sem tratamento de erro/timeout travam o loading.
- Hook de roles (`useUserRoles`) podia ficar em `loading` permanente em mudanca de sessao.

## Mudancas aplicadas no codigo
- Timeout global nas requisicoes do Supabase no client.
- Tratamento de erro/`finally` em telas que podiam travar loading.
- Timeout de roles reiniciado a cada carga e limpeza correta.
- **Observacao:** foi criado `middleware.ts` e depois removido por conflito com `proxy.ts` no build do Next 16.

## Arquivos alterados
- `lib/supabaseClient.ts`
- `hooks/useUserRoles.ts`
- `components/Sidebar.tsx`
- `components/home/HomeMemberSearch.tsx`
- `app/admin/meu-login/page.tsx`
- `app/admin/cadastros/page.tsx`
- `app/admin/permissoes/page.tsx`

## Erro de build encontrado
- Next 16 nao permite `middleware.ts` e `proxy.ts` juntos.
- Solucao: manter **somente** `proxy.ts`.

## Proximos passos (quando retomar)
1. Pegar erros do console do navegador na tela inicial (e na rota que travar).
2. Confirmar se o usuario logado tem `membros.user_id` e perfil em `membro_perfis`.
3. Validar se a pagina publica (`/`) falha por auth ou por API (ver erro exato).
4. Se continuar falhando, adicionar logs temporarios nas consultas do client para capturar status/codes.

Resumo (2026-02-06)

Sintoma: tela ficava “Carregando…” e depois aparecia “Não foi possível carregar os eventos…”.
Foco do diagnóstico: falha na leitura da tabela eventos (RLS/permissions ou erro de schema).
Verificação do schema enviada pelo usuário: colunas existem (data_inicio, data_fim, hora_inicio etc.) — schema OK.
Conclusão provável: problema de RLS/permissions para leitura pública (anon) na tabela eventos.
SQL recomendado para corrigir leitura pública:
alter table public.eventos enable row level security;

drop policy if exists "Enable read access for all users" on public.eventos;

create policy "Enable read access for all users"
on public.eventos
for select
using (true);

grant select on public.eventos to anon, authenticated;
Foi explicado que essas mudanças são no banco e não exigem deploy.
Após isso, o usuário relatou comportamento inconsistente (“hora funciona e hora não funciona”).
Próximo passo sugerido: coletar erro do console/network (status/mensagem do GET .../rest/v1/eventos), pois intermitência aponta para sessão/auth instável, timeout ou rede móvel.
Quando voltar, podemos:

Rodar os SQLs de diagnóstico (pg_policies e role_table_grants).
Instrumentar logs no código para capturar error.code, status, message nas consultas de eventos.

## Atualização (2026-02-07)

### Mudanças estruturais aplicadas
- `lib/supabaseClient.ts`
  - Voltou para `createBrowserClient` de `@supabase/ssr` (compatível com middleware/cookies).
  - Timeout global de request restaurado (`NEXT_PUBLIC_SUPABASE_TIMEOUT_MS`, default 15000ms).
- `contexts/AuthProvider.tsx`
  - Reescrito fluxo de sincronização de sessão/roles com controle de corrida (`syncId`).
  - Resync automático em `window focus` e `visibilitychange` para cenário de app instalado/PWA.
  - Logs detalhados com prefixo `[AuthProvider]`.
- `components/Sidebar.tsx`
  - Menu restrito agora depende apenas de estado de auth/roles (não do check de admin compartilhado).
  - Check de admin compartilhado separado para não bloquear renderização do menu.
  - Logout resiliente (`global` com fallback `local`) + logs `[Sidebar]`.
- `app/login/page.tsx`
  - Logs de tentativa/sucesso/falha de login com prefixo `[Login]`.
- `lib/supabase/middleware.ts`
  - Logs server-side de `auth.getUser`, bloqueio de rota `/admin` e requests autenticados.
- `scripts/diagnostico_auth.sql`
  - Script de conferência rápida para vínculo auth/users, perfis e políticas RLS/grants.

### Onde olhar os logs no deploy
- Browser console:
  - `[SupabaseClient]`
  - `[AuthProvider]`
  - `[Sidebar]`
  - `[Login]`
- Server logs (Vercel):
  - `[Middleware]`

### Objetivo dessas mudanças
- Eliminar estado "logado mas com menu público" por corrida entre sessão, roles e checks auxiliares.
- Reduzir inconsistência em app instalado após voltar do background.
- Tornar o ponto exato de falha observável para fechar causa-raiz caso ainda haja intermitência.
