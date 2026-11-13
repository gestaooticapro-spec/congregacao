# Plano técnico: contadores de cobertura em Responsabilidades

## Objetivo

Exibir nos cartões da página Responsabilidades quantas datas ou semanas futuras já têm designações válidas. O número deve ajudar cada responsável a estimar quando será necessário preparar novas designações.

O período começa na data de hoje, inclusive, e não tem limite final. A data civil deve vir de getCongregationDate() em lib/dateUtils.ts, que usa America/Sao_Paulo.

## Interface

- Adicionar os contadores aos cartões de Reunião de Meio de Semana, Discursos, Designações de Apoio, Campo e Limpeza, renderizados por components/MenuHub.tsx.
- Meio de Semana mostra um selo no ícone no formato cadastradas/completas, por exemplo 8/5. O tooltip explica a ordem, por exemplo: “8 programações cadastradas; 5 semanas completamente designadas”.
- Os outros cartões mostram um número e uma descrição acessível da unidade: datas com discurso, reuniões de apoio, datas com dirigente de campo ou semanas de limpeza cobertas.
- Após uma consulta bem-sucedida, exibir o selo mesmo quando o valor for 0. Durante a consulta, exibir carregamento. Falha de consulta deve aparecer como indisponível, nunca como zero.
- O selo é um botão independente do Link que leva à página do cartão. Reestruturar a marcação para que Link e botão sejam elementos irmãos; não aninhar controles interativos. O botão abre a explicação por hover, foco do teclado e toque/clique. Não depender apenas do atributo title e não deixar o toque navegar para o cartão.
- Manter getVisibleMenuSections() como regra de visibilidade. Consultar apenas métricas dos cartões que o perfil pode ver. Não adicionar badge ao ícone geral da Sidebar.

## Regras e dados de cada contador

### Reunião de Meio de Semana

Consultar programacao_semanal selecionando id, data_reuniao, evento_tipo, presidente_id, presidente_status, oracao_inicial_id, oracao_inicial_status, oracao_final_id, oracao_final_status e partes, com filtro data_reuniao >= hoje.

- Cadastradas: contar datas futuras distintas, sem depender de a constraint de unicidade estar aplicada no banco remoto.
- Completas: agrupar registros pela data. Uma data conta como completa somente se todos os registros daquela data forem dos tipos normal ou visita spte e cada programação tiver presidente, orações inicial e final e membro principal de cada parte preenchidos.
- Se uma data_reuniao retornada não for uma data civil válida, tornar indisponíveis as duas métricas de Meio de Semana; não produzir total parcial.
- Se o status de um desses designados for declined, a respectiva vaga fica incompleta mesmo que o ID continue preenchido. accepted e pending contam como designados, pois a vaga já foi atribuída e pending ainda não requer uma nova designação. Registros antigos sem status contam quando o ID está preenchido.
- Para parte que oferece ajudante/leitor na tela de designações, exigir ajudante_id. Se ajudante_status for declined, a vaga do ajudante/leitor fica incompleta mesmo que o ID esteja presente. accepted, pending e ausência de status contam quando ajudante_id estiver preenchido. O status recusado afeta somente a vaga correspondente.
- Exigir ajudante só na demonstração de duas pessoas de Faça Seu Melhor no Ministério. Discurso e consideração feita por um irmão ou uma irmã não têm ajudante: o título “Discurso”, ou a instrução que começa com “Consideração” logo depois do tempo, dispensa ajudante_id. As demais partes de Ministério exigem ajudante. Em Vida Cristã, exigir ajudante_id quando o nome contém literalmente “estudo bíblico”. Acento importa. O leitor da parte identificada como “Leitura do Estudo” fica em membro_id, não em ajudante_id.
- Extrair o predicado para uma função pura compartilhada entre a tela de designações e o agregador, para que não surjam regras divergentes. A função deve validar tipo e nome antes de chamar toLowerCase().
- Uma lista de partes ausente, não-array ou inválida não é completa. Se um item não for objeto válido, não tiver tipo reconhecido ou não tiver nome string, marcar somente essa programação como incompleta; não interromper a agregação das outras programações. Assembleias, congressos e celebrações entram em cadastradas, mas não em completas, pois a tela atual não oferece designações de meio de semana para esses tipos.

Os status superiores são presidente_status, oracao_inicial_status e oracao_final_status. Para o designado principal de uma parte, conferir status no próprio objeto JSON; para ajudante/leitor, conferir ajudante_status no objeto JSON. Somente declined invalida a vaga cujo status foi recusado. Ao trocar o membro designado na tela de designações, redefinir para pending somente o status da vaga cujo ID mudou: colunas de status dos papéis superiores e status/ajudante_status da parte. A comparação usa a linha carregada do banco, não o estado já editado. Tratar string vazia como ID ausente, porque o select guarda "" e o update já converte com || null. Se o ID permanecer igual, preservar seu status. Se o ID for removido, a vaga permanece incompleta. Isso evita que a recusa de um membro continue bloqueando a cobertura e a confirmação do novo designado. A RPC salvar_designacoes_suporte também grava programacao_semanal.presidente_id quando a data do apoio coincide com data_reuniao, e não altera presidente_status. Esse caminho fica como está; o reset para pending vale para o salvamento de app/admin/designacoes/[id]/page.tsx.

### Discursos

Consultar somente agenda_discursos_locais, selecionando id, data, orador_local_id e orador_visitante_id, com filtro data >= hoje. Excluir agenda_discursos_fora, conforme decisão do usuário.

Contar datas distintas com discurso local ou visitante, agrupando em memória e sem depender da constraint de unicidade de data no banco remoto. O banco exige exatamente um dos dois oradores por registro; logo, não usar como cenário de teste uma linha válida sem orador. Testar duas linhas válidas na mesma data e confirmar que a data aumenta a cobertura somente uma vez. Se uma data retornada não for uma data civil válida, tornar somente a métrica de Discursos indisponível em vez de produzir uma contagem parcial.

### Designações de Apoio

Consultar designacoes_suporte, selecionando id, data, funcao e membro_id, com filtro data >= hoje. Agrupar por data e contar cada reunião uma vez somente quando todas as funções aplicáveis tiverem um membro designado.

Usar exatamente as funções atualmente pedidas por app/admin/escalas/[date]/page.tsx:

- Todos os dias: SOM, MICROFONE_1, MICROFONE_2, INDICADOR_ENTRADA e INDICADOR_AUDITORIO.
- Sábado e domingo: acrescentar PRESIDENTE e LEITOR_SENTINELA.
- VIDEO existe no enum do banco, mas não aparece no formulário e não é função aplicável para este contador.

Uma função só está preenchida se a linha da data/função tiver membro_id não nulo. Ausência de linha significa vaga em aberto. Uma data parcialmente preenchida não conta como cobertura. Agrupar e contar datas distintas, mesmo que a constraint de data/função não esteja aplicada remotamente. Se uma data retornada não for válida, tornar somente a métrica de Apoio indisponível em vez de produzir uma contagem parcial.

Extrair ROLES e o predicado de fim de semana para helpers compartilhados entre o editor e o contador. Calcular o dia da semana a partir da data civil YYYY-MM-DD sem interpretá-la no fuso local. O dia de semana de uma data civil não deve depender do local físico nem do fuso do navegador. No helper civil, segunda é 0, sábado é 5 e domingo é 6. O fim de semana do apoio é sábado ou domingo, ou seja, índices 5 e 6. Não reutilizar os números de Date.getDay() do editor atual, em que 0 é domingo e 6 é sábado.

### Campo

Consultar escalas_campo selecionando id, data e dirigente_id, com filtro data >= hoje. Cada linha já exige um dirigente. Contar datas distintas com dirigente preenchido. Duas linhas na mesma data aumentam a cobertura uma vez. Se uma data retornada não for uma data civil válida, tornar somente a métrica de Campo indisponível.

### Limpeza: semana segunda a domingo

escala_limpeza.data_inicio é uma data DATE documentada como segunda-feira da semana. No banco, data_inicio + 2 representa quarta-feira e data_inicio + 5 representa sábado. A semana é segunda a domingo; não confundir esse padrão com Date.getDay(), que usa domingo como índice 0.

- Consultar escala_limpeza selecionando id, data_inicio e grupo_id.
- Obter hoje como YYYY-MM-DD por getCongregationDate().
- Usar a função de semana ISO para confirmar a convenção civil: segunda tem índice 0, sábado 5 e domingo 6; a segunda atual é a mais recente menor ou igual a hoje.
- Buscar data_inicio >= hoje menos cinco dias civis. Como a última ocorrência semanal é data_inicio + 5 para sábado, esse limite captura qualquer linha que ainda possa representar uma limpeza futura, inclusive uma linha malformada cujo dia inicial não seja segunda. Validar o dia inicial depois da consulta; uma segunda-feira válida da semana atual continua incluída.
- Exigir grupo_id não nulo.
- Contar cada data_inicio distinta uma vez se data_inicio + 2 ou data_inicio + 5, calculados como dias civis, forem >= hoje. Se ambas as ocorrências passaram, não contar.

Toda aritmética usa datas civis, sem converter uma string YYYY-MM-DD em instante no fuso local. Para obter o dia de semana, usar componentes da data em UTC e getters UTC ou implementação pura equivalente. No helper da semana, segunda tem índice 0, sábado 5 e domingo 6. Esses números não são os de Date.getDay(). Ao somar dias, formatar o resultado por ano, mês e dia em UTC de volta para YYYY-MM-DD. Não usar toISOString() para derivar datas de agenda. Comparar datas civis canônicas YYYY-MM-DD como strings é válido. Se qualquer data necessária retornada por escala_limpeza for impossível ou malformada, tornar a métrica de Limpeza indisponível em vez de pular a linha e apresentar uma cobertura menor como resultado completo.

Promover a soma de dias civis existente em lib/pastoreioDates.ts para lib/civilDate.ts e adicionar ali a função de início de semana ISO. Preservar a assinatura e o comportamento existente de addCalendarDays() e manter os imports atuais compatíveis, fazendo lib/pastoreioDates.ts importar/reexportar a função. Criar isValidCivilDate(), que valida existência real no calendário além do formato: verificar o padrão YYYY-MM-DD, converter componentes para UTC e confirmar que getters UTC retornam os mesmos componentes. Não usar isYmd() sozinha para validar dia civil: ela só verifica o formato, então valores como 2026-02-31 passam pelo teste de formato, mas falham no teste de existência. A nova função de início de semana rejeita entradas inválidas sem normalizá-las. O agregador valida cada data recebida. Uma data impossível torna indisponível somente a métrica da fonte correspondente. Para linhas com data_inicio válida retornadas pela consulta cujo início não seja segunda, ignorar e registrar diagnóstico; a tela atual gera segundas, embora o schema não imponha essa condição.

## Carregamento, paginação e falhas

Criar lib/responsibilityCounts.ts para o tipo do resultado, carregamento das fontes e funções puras de agregação. Distinguir explicitamente valor zero, carregamento e falha, por exemplo com resultado number | null para cada métrica e estrutura própria com scheduled/complete para Meio de Semana.

Executar somente na página Responsabilidades e somente para os cartões visíveis. Consultas independentes podem rodar em paralelo. Selecionar apenas as colunas necessárias e ordenar por data e por uma chave estável adicional quando houver empate, como id ou funcao.

Paginar com range(start, start + 499) em lotes solicitados de até 500 linhas; range usa limites inclusivos. Não presumir que o limite configurado no projeto Supabase permita devolver 500 linhas: solicitar count exact em cada página e usar a quantidade efetivamente retornada para avançar o offset. Continuar enquanto offset < total exato, mesmo quando uma página vier menor que 500 por limite do servidor e mesmo quando o total for múltiplo do tamanho solicitado. O total só é utilizável quando Number.isFinite(count). null, undefined e NaN, como o parseInt de um Content-Range sem número, deixam a métrica indisponível. Se não houver progresso antes de alcançar o total, falhar a métrica em vez de parar com resultado parcial. Usar ordem estável: data_reuniao e id para programacao_semanal; data e id para agenda_discursos_locais; data, funcao e id para designacoes_suporte; data_inicio e id para escala_limpeza; data e id para escalas_campo. Incluir as chaves de ordenação no select. Agrupar datas distintas em memória e não depender das constraints remotas de unicidade para evitar duplicatas. Todas as linhas são necessárias para deduplicar datas, validar funções e estados. Cada fonte deve falhar isoladamente: erro em uma consulta deixa apenas sua métrica como indisponível; não mascara como 0 nem bloqueia os demais cartões.

Carregar ao abrir ou voltar a Responsabilidades e imediatamente quando a aba do navegador voltar a ficar visível. Enquanto a página estiver visível, comparar getCongregationDate() com a data usada na última consulta uma vez por minuto; repetir as consultas quando o valor mudar. Assim, o contador atualiza após a virada do dia em São Paulo sem manter consultas Realtime.

## Critérios de aceite

1. Duas datas futuras distintas com discurso local e orador mostram 2; duas linhas válidas na mesma data mostram 1; discurso fora não muda o resultado.
2. Meio de Semana mostra cadastradas/completas nessa ordem. Uma programação parcial aumenta apenas cadastradas; status declined deixa a vaga incompleta; pending, accepted e registros sem status com membro preenchido contam.
3. A regra compartilhada de ajudante exige ajudante_id nas demonstrações de Ministério e em Vida Cristã quando o nome contém literalmente “estudo bíblico”. Discurso e consideração feita por um irmão ou uma irmã não exigem ajudante. A forma sem acento não satisfaz a regra do estudo bíblico.
4. Apoio incompleto não conta. Uma reunião completa conta uma vez, não uma vez por função. Validar papéis de dias úteis, sábado/domingo e a exclusão de VIDEO. No índice civil, sábado é 5 e domingo é 6; os números 0 e 6 de Date.getDay() não identificam o fim de semana.
5. Limpeza: segunda conta as datas da semana que ainda estão por vir; quarta inclui as limpezas de quarta e sábado; quinta inclui a de sábado; domingo não inclui ocorrências da semana anterior. Uma escala sem grupo e uma linha cujo início não seja segunda não contam. Helper puro rejeita 2026-02-31, mas aceita 2024-02-29 e soma dias corretamente na virada de mês/ano.
6. Mais de 500 linhas percorrem todas as páginas. Simular um limite servidor menor que 500, usando total exato maior que o número retornado; o agregador continua até total. Se a última página vier cheia, consultar até offset alcançar total. count null ou NaN torna a métrica indisponível, sem exibir a página já recebida como total final.
7. Hoje é incluído e ontem excluído, inclusive perto da meia-noite de America/Sao_Paulo. A segunda-feira é calculada no calendário civil correto. Datas impossíveis como 2026-02-31 são rejeitadas, 2024-02-29 é válida e somas atravessam corretamente virada de mês/ano.
8. Zero de consulta bem-sucedida é visível; erro é mostrado como indisponível. As outras métricas continuam sendo exibidas em caso de falha parcial.
9. O selo 8/5 explica os números por hover, foco e toque, não navega ao tocar e não contém elementos interativos aninhados.
10. Recusa do designado principal e recusa do ajudante/leitor invalidam somente a vaga correspondente. accepted, pending e ausência de status contam se o respectivo ID existir.
11. Um registro com data impossível torna indisponível apenas a métrica da respectiva fonte. Uma parte sem nome string torna a programação incompleta sem derrubar a métrica da reunião.
12. No período atual, a consulta de Limpeza captura linhas desde cinco dias antes de hoje, valida quais começam em segunda e não conta semanas cujas duas ocorrências já passaram.
13. Ao substituir pessoa recusada na tela de designações, somente o status da vaga cujo ID mudou volta para pending. A comparação é com a linha carregada. String vazia conta como ID ausente. Manter o mesmo ID recusado continua incompleto; remover o ID também deixa a vaga incompleta. salvar_designacoes_suporte pode gravar presidente_id sem esse reset.

## Decisões já confirmadas

- Futuro começa hoje, inclusive, sem limite final.
- Discursos conta somente a agenda na congregação.
- A cobertura de Meio de Semana e Apoio exige todas as designações aplicáveis preenchidas.
- Designação recusada do principal ou do ajudante/leitor não fornece cobertura; pendente conta até ser recusada. Cada recusa abre somente a vaga correspondente.
- Zero deve ser exibido.
- O selo de Meio de Semana usa o formato cadastradas/completas com legenda acessível.
- A semana de limpeza é segunda a domingo; as ocorrências são quarta e sábado.
