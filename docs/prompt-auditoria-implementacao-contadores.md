# Prompt — auditoria da implementação dos contadores de Responsabilidades

Audite a implementação descrita em:

docs/plano-contadores-responsabilidades.md

O plano é a especificação fechada. Compare o código do repositório com ele, com os tipos gerados, com as migrations e com o contrato local de range/count do supabase-js/PostgREST. Não reabra decisões já confirmadas no plano. Se o código divergir do plano, o achado é defeito de implementação. Só registre defeito de plano se o plano for impossível diante do repositório.

Faça uma revisão somente de leitura do repositório. Não altere código, plano, migrations nem outros arquivos. Não crie teste permanente nem framework de teste. Pode rodar `npx tsc --noEmit` e um script temporário fora do repositório para exercitar funções puras; apague esse script ao terminar. Separe fatos verificados de pressupostos sobre o banco remoto. Cite caminho e linha para cada conclusão. Se não houver ferramenta de navegador, declare que a tela não foi clicada.

Confira os critérios de aceite 1 a 13 do plano no código, em especial:

1. Discursos consulta só `agenda_discursos_locais`, com `id`, `data`, `orador_local_id` e `orador_visitante_id`, filtro `data >= hoje`. `agenda_discursos_fora` não entra. Datas distintas contam uma vez. Linha sem orador não conta. Data civil impossível torna só a métrica de Discursos indisponível.
2. Meio de Semana seleciona as colunas do plano, filtra `data_reuniao >= hoje` e mostra cadastradas/completas nessa ordem. Uma data conta como completa só se todas as linhas daquela data forem `normal` ou `visita spte` e cada programação tiver presidente, orações e partes cobertas. Assembleia, congresso e celebração entram só em cadastradas. `partes` ausente, não-array ou vazio não é completo. Item sem objeto, tipo reconhecido ou nome string deixa só aquela programação incompleta.
3. `parteExigeAjudante` exige ajudante nas demonstrações de duas pessoas de `MINISTERIO` e em `VIDA_CRISTA` cujo nome em minúsculas contém literalmente “estudo bíblico”. Título “Discurso”, ou instrução “Consideração” logo após o tempo, não exige ajudante. A forma sem acento não exige o leitor do estudo. “Leitura do Estudo” usa `membro_id`. Tipo ou nome ausente ou de tipo errado devolve falso sem lançar exceção. A tela de designações e o agregador usam a mesma função.
4. Apoio usa os papéis do editor: todos os dias SOM, MICROFONE_1, MICROFONE_2, INDICADOR_ENTRADA e INDICADOR_AUDITORIO; sábado e domingo também PRESIDENTE e LEITOR_SENTINELA. VIDEO não conta. Papel preenchido exige alguma linha daquela data/função com `membro_id` não vazio; ausência de linha é vaga aberta. Data parcial não conta. Data distinta conta uma vez. Data impossível torna só Apoio indisponível. O editor em `app/admin/escalas/[date]/page.tsx` usa o helper civil compartilhado. No helper, segunda é 0, sábado 5 e domingo 6. Não usar os números de `Date.getDay()`.
5. Limpeza seleciona `id`, `data_inicio` e `grupo_id`, com `data_inicio >= hoje` menos cinco dias civis. Exige `grupo_id` não nulo. Conta cada segunda distinta uma vez se quarta (`+2`) ou sábado (`+5`) for `>= hoje`. Domingo não inclui a semana cuja quarta e cujo sábado já passaram. `data_inicio` válida fora de segunda é ignorada com diagnóstico e não derruba a métrica. Data impossível, ou `hoje` inválido, torna só Limpeza indisponível.
6. `fetchAllPages` pede `count: 'exact'`, usa range inclusivo de até 500 e avança pelo número de linhas devolvido enquanto `offset < total`. Total só vale se `Number.isFinite(count)`. Página vazia com `offset < total`, dado nulo ou não-array, erro, exceção ou página repetida sem progresso falham a métrica. Total 0 com página vazia é sucesso e vira `[]`. Ordem estável e chaves no select: `programacao_semanal` por `data_reuniao, id`; `agenda_discursos_locais` por `data, id`; `designacoes_suporte` por `data, funcao, id`; `escala_limpeza` por `data_inicio, id`.
7. A data de corte vem de `getCongregationDate()` em `America/Sao_Paulo`. Hoje entra e ontem fica de fora. Nenhuma data de agenda nasce de `new Date('yyyy-MM-dd')` nem de `toISOString()`. `isValidCivilDate` rejeita `2026-02-31` e `2025-02-29` e aceita `2024-02-29`. Somas atravessam mês, ano e 29 de fevereiro. `isYmd` continua só formato. `startOfCivilWeek` rejeita entrada inválida sem normalizar. `addCalendarDays` mantém assinatura e o rollover antigo, e `lib/pastoreioDates.ts` reexporta a função sem mudar `isVisitaAtrasada`.
8. Zero depois de consulta concluída aparece no selo. Falha é “—” com explicação “Contagem indisponível”, nunca 0. Falha de uma fonte não zera nem esconde as outras. Enquanto o resultado ainda não chegou, o selo mostra carregamento, sem piscar indisponível. Nova consulta volta ao carregamento. Resposta lenta de uma geração anterior não sobrescreve a mais nova.
9. O selo é um `button type="button"` irmão do `Link`, não aninhado. Clique, foco e hover de mouse abrem a explicação; toque não usa `mouseenter` e não navega. Escape fecha e tira o foco. O clique no selo ou na dica não cai no link. Plurais de 0, 1 e n estão corretos. Meio de Semana explica a ordem cadastradas/completas.
10. `declined` abre só a vaga daquele status. `accepted`, `pending` e status ausente contam se o ID daquela vaga existe. String vazia ou só com espaços é ID ausente.
11. Data impossível derruba só a métrica da fonte. Parte malformada derruba só a programação.
12. A janela de limpeza e o filtro de segunda estão implementados como no item 5, inclusive na quinta, no domingo e com segunda duplicada.
13. No salvamento de `app/admin/designacoes/[id]/page.tsx`, só a vaga cujo ID mudou em relação à linha carregada volta para `pending`. O mesmo ID preserva o status, inclusive `declined`. ID removido não grava `pending` e deixa a vaga incompleta. Ajudante que o predicado não exige não recebe status novo. A RPC `salvar_designacoes_suporte` permanece sem esse reset. Não marque esse caminho como defeito: o plano o aceita.

Confira também o alcance da interface:

- Selos só quando `groupId` é `responsabilidades` e só nos hrefs `/programacao`, `/admin/discursos`, `/admin/escalas`, `/admin/campo` e `/admin/limpeza` que `getVisibleMenuSections` deixou visíveis. `/anciaos` e `/administracao` não consultam nem mostram selo. A Sidebar não ganha badge.
- Campo conta datas distintas de `escalas_campo` com `data >= hoje` e `dirigente_id` preenchido. Data impossível torna só essa métrica indisponível.
- Cada fonte só é consultada se o cartão correspondente estiver visível. Consultas independentes não se bloqueiam.
- Recarregar ao montar, ao `visibilitychange` quando a aba fica visível, e no máximo uma vez por minuto enquanto visível se `getCongregationDate()` mudou. Sem Realtime.
- Os perfis que veem cada cartão continuam autorizados pelo SELECT existente. Não proponha migration nova se a política atual já cobre a leitura.

Não trate como defeito o que o plano deixou de fora: a lista em `app/admin/escalas/page.tsx` pode manter o `isWeekend` local; `app/actions/autoAssignSupport.ts`, `app/confirmar/page.tsx` e `lib/midweekReminder.ts` não precisavam mudar. Se algum deles puder gravar cobertura incoerente com o contador, registre como observação fora do escopo, sem pedir correção nesta entrega.

Entregue:

- conclusão explícita: implementação fiel ao plano, ou ainda precisa de correção;
- achados por severidade (bloqueador, alto, médio, baixo), com arquivo e linha;
- pressupostos que o repositório não confirma, em especial constraints e teto de linhas do banco remoto;
- correções necessárias em ordem de prioridade, sem aplicar nenhuma;
- critérios de aceite verificados e os que ficaram sem prova executável.

Não repita recomendação já absorvida pelo plano. Não implemente mudanças.
