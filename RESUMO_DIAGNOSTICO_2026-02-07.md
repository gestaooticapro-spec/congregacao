# Resumo do Diagnóstico (2026-02-07)

## Objetivo
Resolver a inconsistência de login/sessão em produção (incluindo app instalado/PWA), onde o usuário aparece logado mas enxerga apenas menu público.

## Alterações aplicadas

### 1) Cliente Supabase alinhado com SSR/middleware
- Arquivo: `lib/supabaseClient.ts`
- Ajustes:
  - uso de `createBrowserClient` (`@supabase/ssr`) em vez de `@supabase/supabase-js` puro.
  - timeout global de requests restaurado via `fetchWithTimeout`.
  - variável: `NEXT_PUBLIC_SUPABASE_TIMEOUT_MS` (default: `15000`).

### 2) Fluxo de auth/roles reestruturado
- Arquivo: `contexts/AuthProvider.tsx`
- Ajustes:
  - sincronização centralizada com `syncFromSession`.
  - controle de corrida com `syncId` (evita sobrescrever estado por resposta antiga).
  - ressincronização ao voltar para o app (`focus` e `visibilitychange`).
  - logs detalhados com prefixo `[AuthProvider]`.

### 3) Sidebar sem bloqueio indevido de menu restrito
- Arquivo: `components/Sidebar.tsx`
- Ajustes:
  - visibilidade do menu restrito depende apenas de auth/roles.
  - `checkingAdmin` (rótulo de senha compartilhada) não bloqueia menu.
  - logout resiliente (`global` com fallback `local`) e logs `[Sidebar]`.

### 4) Login com rastreabilidade
- Arquivo: `app/login/page.tsx`
- Ajustes:
  - logs de tentativa, erro e sucesso (`[Login]`).
  - navegação após login usando `router.replace('/')` + `router.refresh()`.

### 5) Middleware com logs server-side
- Arquivo: `lib/supabase/middleware.ts`
- Ajustes:
  - logs para erro em `auth.getUser`.
  - log de bloqueio de `/admin` sem autenticação.
  - log de acesso autenticado em rotas `/admin`.

### 6) SQL de pente-fino para Supabase
- Arquivo: `scripts/diagnostico_auth.sql`
- Inclui:
  - usuários auth sem membro vinculado.
  - duplicidade de `membros.user_id`.
  - membros com login sem perfil.
  - policies/grants de `membros`, `membro_perfis`, `eventos`.
  - validação pontual por email.

## Logs para observar no deploy
- Browser console:
  - `[SupabaseClient]`
  - `[AuthProvider]`
  - `[Sidebar]`
  - `[Login]`
- Server logs (Vercel):
  - `[Middleware]`

## Status de validação
- Lint dos arquivos alterados: OK.
- Lint global do projeto: ainda falha por erros antigos não relacionados a este pacote.

## Próximos passos
1. Deployar e reproduzir no PC instalado e no Android.
2. Capturar os logs com os prefixos acima no momento da falha.
3. Rodar `scripts/diagnostico_auth.sql` no Supabase.
4. Consolidar evidências para fechar a causa-raiz final.
