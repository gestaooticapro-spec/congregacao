# Decisao de autenticacao de membros

Atualizado em 2026-09-01.

## Estado atual

- As migrations `120004` e `120005` ja foram aplicadas no banco de producao.
- A migration `120006_secure_pin_and_pioneer_logs.sql` esta versionada no projeto, mas ainda deve ser aplicada antes dos testes do proximo ciclo.
- O sistema ainda possui fluxos por PIN e algumas RPCs concedidas ao papel `anon`. Isso foi mantido temporariamente porque, historicamente, a autenticacao Supabase causava instabilidade no uso geral.

## Decisao de produto

O objetivo de seguranca prioritario e cumprir a LGPD e impedir que pessoas de fora da congregacao usem o sistema. Entre membros legitimamente autorizados, nao sera criada agora uma separacao excessivamente restritiva por tela ou funcao.

O uso atual de `anon` nao representa um requisito de produto definitivo. Ele e uma solucao transitoria de compatibilidade e devera ser removido quando houver uma sessao confiavel de membro.

## Proxima etapa planejada

Criar uma sessao temporaria de membro validada por PIN no servidor. A sessao deve:

1. Validar que o PIN pertence a um membro ativo.
2. Emitir um token temporario e revogavel, sem armazenar o PIN como credencial de longa duracao no navegador.
3. Permitir que as RPCs de home, relatorios, pioneiro e confirmacoes exijam essa sessao.
4. Remover os grants para `anon` dessas RPCs.
5. Definir a experiencia da confirmacao por WhatsApp: exigir login/sessao de membro ou usar um token de confirmacao com expiracao.

Essa etapa deve ser feita em uma migration posterior, sem editar as migrations ja aplicadas.

## Fora de escopo por enquanto

- Rate limiting de tentativas de PIN.
- Migracao de PIN para hash/tabela separada.
- Restricoes finas entre cargos de membros legitimamente autenticados.
- Tratamento de concorrencia extrema em designacoes.
