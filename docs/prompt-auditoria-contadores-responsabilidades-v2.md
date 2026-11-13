# Prompt v2 — auditoria técnica dos contadores de Responsabilidades

Audite o plano atualizado neste caminho:

docs/plano-contadores-responsabilidades.md

Faça uma revisão somente de leitura. Não implemente código, não altere o plano nem edite outros arquivos. Compare o plano com o repositório, os tipos gerados e as migrations. Separe fatos verificados de pressupostos sobre o banco remoto ou bibliotecas instaladas. Cite caminhos e linhas para sustentar cada conclusão.

Confira especialmente:

1. Se os campos de status recusado dos designados principais e de ajudante/leitor são presidente_status, oracao_inicial_status, oracao_final_status, status e ajudante_status, e se a RPC realmente os grava.
2. Se a regra de cobertura trata declined como vaga aberta, mas conta pending, accepted e ausência de status com ID preenchido.
3. Se o plano de redefinir a vaga para pending ao mudar o membro está implementável para cada papel, se não limpa status de outra vaga e se o status antigo não bloqueia o novo link de confirmação. Verifique as funções de alteração/salvamento antes de validar essa decisão.
4. Se o predicado compartilhado de ajudante/leitor reproduz literalmente a tela: tipo MINISTERIO ou VIDA_CRISTA com nome em minúsculas contendo “estudo bíblico”, com a diferença de acento preservada. Confirme a regra de Leitura do Estudo e que nomes/tipos malformados não lançam exceção.
5. Se uma data impossível, como 2026-02-31, é rejeitada por isValidCivilDate; se 2024-02-29 é aceita e somas civis atravessam corretamente mês, ano e ano bissexto. Confirme que a mudança do helper preserva os imports e comportamento esperado de lib/pastoreioDates.ts.
6. Se datas impossíveis retornadas tornam indisponível somente a métrica daquela fonte, enquanto uma parte malformada torna somente sua programação incompleta.
7. Se consultar limpeza desde hoje menos cinco dias é suficiente porque a ocorrência mais distante é data_inicio + 5; confirme que semanas já passadas não entram, que data_inicio fora de segunda é ignorada com diagnóstico e que a semana civil permanece segunda a domingo.
8. Se agrupar por datas distintas atende cada contador mesmo que constraints remotas de unicidade não estejam aplicadas.
9. Se count exact junto com range(start, start + 499), avançando pelo número efetivamente retornado até o total, protege contra limite máximo de resposta menor que 500. Verifique o contrato de range na versão local do supabase-js/PostgREST. Se o contrato ou teto remoto não for verificável, declare isso e recomende uma salvaguarda.
10. Se as ordenações e chaves selecionadas tornam paginação estável nas quatro fontes, inclusive empates e páginas de tamanho múltiplo.
11. Se o botão do selo como irmão do Link resolve navegação acidental, marcação interativa aninhada e tooltip em mouse, teclado e toque.
12. Se RLS, visibilidade por perfil, loading, zero, falha isolada, atualização ao foco e verificação de data a cada minuto estão descritos sem produzir contagens silenciosamente parciais.

Entregue:
- conclusão explícita: pronto para implementação ou ainda precisa de revisão;
- achados classificados por severidade, com arquivo e linha;
- pressupostos que não podem ser confirmados pelo repositório;
- correções necessárias em ordem de prioridade;
- itens verificados sem problemas.

Não repita recomendações anteriores sem conferir se a versão atual já as resolveu. Não implemente mudanças.
