# Plano de Implementacao Multi-Tenant com Janela Curta de Manutencao

## Resumo
Este plano substitui a estimativa anterior de "1 dia" por um rollout mais seguro e realista. A estrategia escolhida e preparar quase tudo com o app online e fazer uma janela curta de manutencao apenas no cutover final, quando banco, `RLS`, fluxo de `PIN` e contexto de congregacao passarem a valer juntos.

Estimativa:
- MVP funcional com seguranca basica: **3 a 5 dias uteis**
- Implementacao correta no sistema atual: **8 a 12 dias uteis**
- Planejamento operacional: reservar **30 a 90 minutos** de manutencao no dia do corte

## Objetivo
Permitir que multiplas congregacoes usem a mesma infraestrutura com isolamento real de dados por tenant, sem depender de convencoes frageis no frontend.

O resultado esperado e:
- cada congregacao enxerga apenas seus proprios dados
- login via `PIN` deixa de ser global
- sessoes locais carregam contexto de congregacao
- area admin e area publica continuam funcionando apos o corte

## Decisoes ja tomadas
- Estrategia de rollout: **janela curta de manutencao**
- A primeira congregacao atual sera migrada como tenant padrao inicial
- O app nao ficara em modo misto por muito tempo
- O cutover so acontece quando frontend, banco e `RLS` estiverem compativeis entre si

## Etapa 1: Levantamento e mapeamento
1. Listar todas as tabelas usadas pelo app que precisam de isolamento por congregacao.
2. Confirmar quais tabelas sao realmente tenantizadas e quais podem continuar globais.
3. Revisar todas as `policies` atuais de `RLS`.
4. Revisar todas as `RPCs` e fluxos que hoje dependem apenas de `pin`.
5. Revisar todas as consultas diretas do cliente que hoje leem dados sem contexto de tenant.

Saida esperada:
- lista final de tabelas com `congregacao_id`
- lista de funcoes SQL a substituir
- lista de paginas e componentes afetados

## Etapa 2: Preparacao do banco com app online
1. Criar tabela `congregacoes` com `id`, `nome` e `slug`.
2. Inserir a congregacao atual como tenant inicial.
3. Adicionar coluna `congregacao_id` nas tabelas tenantizadas, inicialmente nullable.
4. Popular `congregacao_id` nos registros existentes com o tenant inicial.
5. Adicionar indices por `congregacao_id`.
6. Ajustar constraints unicas que hoje sao globais para passarem a considerar congregacao quando necessario.
7. Criar ou adaptar funcoes auxiliares para resolver tenant por `slug` e por contexto autenticado.
8. Criar novas versoes das `RPCs` de PIN com assinatura multi-tenant, sem remover imediatamente as antigas.
9. Preparar novas `RLS policies`, mas nao ativar a forma final enquanto o app antigo ainda estiver em uso.

Saida esperada:
- banco pronto para multi-tenant em compatibilidade temporaria
- dados antigos preenchidos corretamente
- nenhuma linha critica sem tenant

## Etapa 3: Adaptacao do app antes do corte
1. Atualizar tipos e modelos para incluir `congregacao_id`.
2. Alterar a sessao local do membro para guardar `membro_id`, `congregacao_id`, `pin` e opcionalmente `slug`.
3. Alterar o fluxo do primeiro acesso:
   - selecionar congregacao ou entrar por URL com `slug`
   - localizar o nome apenas dentro daquela congregacao
   - confirmar com `PIN`
4. Alterar o fluxo de reentrada:
   - restaurar sessao local apenas se ela tiver tenant valido
   - invalidar sessoes antigas sem `congregacao_id`
5. Alterar pagina de relatorio para validar e enviar usando tenant explicito.
6. Atualizar home e busca de membro para consultar apenas dados da congregacao correta.
7. Atualizar a area admin para que o vinculo `user -> membro -> perfis` respeite a congregacao correta.
8. Adicionar tratamento claro para sessao antiga, tenant invalido e `slug` inexistente.

Saida esperada:
- app compativel com o novo contrato de banco
- nenhum fluxo principal dependendo de `pin` global
- sessoes antigas tratadas com seguranca

## Etapa 4: Validacao antes da janela
1. Criar duas congregacoes de teste.
2. Duplicar cenarios minimos de uso nas duas.
3. Validar:
   - login admin
   - login via PIN
   - envio de relatorio
   - busca de membros
   - programacao
   - relatorios e paginas administrativas mais criticas
4. Confirmar que nao existe vazamento entre congregacoes.
5. Confirmar que `RLS` final nao quebra consultas do cliente.

Checklist de aprovacao:
- usuario da congregacao A nao ve dados da B
- relatorio da A grava com tenant da A
- admin da A nao acessa telas ou dados da B
- sessao antiga e invalidada sem erro silencioso

## Etapa 5: Janela de manutencao do cutover
1. Avisar os usuarios com antecedencia e escolher horario de baixo uso.
2. Ativar modo manutencao ou bloquear o uso normal.
3. Fazer backup ou export logico das tabelas afetadas.
4. Executar a migracao final:
   - preencher qualquer linha pendente
   - tornar `congregacao_id` obrigatorio
   - ativar `RLS` final
   - trocar `RPCs` antigas pelas definitivas
5. Publicar a versao do app ja compativel com multi-tenant.
6. Executar checklist rapido de validacao em producao.
7. Reabrir o app.

Tempo alvo:
- **30 a 90 minutos**

## Etapa 6: Pos-cutover
1. Monitorar falhas de autenticacao, `RLS` e `RPC`.
2. Verificar sessoes antigas quebrando no cliente.
3. Corrigir inconsistencias pequenas sem mudar o contrato principal.
4. Apos estabilizacao, remover codigo legado e compatibilidade temporaria.
5. Atualizar documentacao para onboarding de novas congregacoes.

## Tabelas e contratos que devem mudar
- Tabela nova: `congregacoes`
- Campos novos nas tabelas tenantizadas: `congregacao_id`
- Sessao local do membro: incluir tenant
- `RPC` de verificacao de `PIN`: receber ou resolver tenant
- `RPC` de envio de relatorio: validar dentro da congregacao correta
- `RLS` de tabelas acessadas por cliente: filtrar por tenant

## Testes minimos obrigatorios
- Mesmo `PIN` em congregacoes diferentes nao cruza acesso
- Busca por nome nao mostra membros de outra congregacao
- Relatorios nao aparecem fora do tenant correto
- Home publica nao mistura compromissos entre congregacoes
- Admin continua funcionando com papeis corretos
- Logout e troca de congregacao limpam a sessao anterior
- Sessao antiga em `localStorage` e rejeitada com mensagem clara

## Riscos principais
- Ativar `RLS` final antes do app novo estar publicado
- Manter `PIN` global ativo por tempo demais
- Esquecer tabelas consultadas diretamente no cliente
- Deixar constraints antigas globais e causar conflito entre congregacoes
- Nao invalidar sessoes antigas sem tenant

## Rollback
Se o cutover falhar:
1. manter o app em manutencao
2. restaurar `policies` e `RPCs` anteriores
3. restaurar dados a partir do backup se necessario
4. republicar a versao anterior do app
5. validar login admin e envio de relatorio antes de reabrir

## Assumptions
- O sistema atual representa uma unica congregacao que sera o tenant inicial.
- As tabelas globais so permanecerao globais se isso for explicitamente intencional.
- O objetivo e seguranca real por banco, nao apenas filtro de frontend.
- O plano prioriza seguranca operacional sobre velocidade maxima.
