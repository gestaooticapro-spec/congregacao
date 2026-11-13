# Pedido de auditoria técnica

Audite o plano descrito no caminho abaixo:

docs/plano-contadores-responsabilidades.md

A revisão deve ser somente de leitura. Não implemente nem altere arquivos.

Compare o plano atualizado com o repositório, incluindo páginas e componentes, tipos gerados, migrations, funções RPC, políticas RLS e helpers de data. Use referências verificáveis: indique o caminho e as linhas que apoiam cada conclusão. Separe fatos observados de inferências.

Confira especialmente:

1. O cálculo de datas civis e o início ISO de semana: segunda-feira deve ter índice 0, domingo índice 6; limpeza quarta e sábado devem corresponder a data_inicio + 2 e +5. Confirme que não há conversão acidental de YYYY-MM-DD para instante local.
2. A migração da soma de dias de lib/pastoreioDates.ts para lib/civilDate.ts, incluindo compatibilidade dos imports existentes, validação de datas e comportamento em ano bissexto e virada de mês/ano.
3. O predicado compartilhado de ajudante/leitor, incluindo o tipo da parte, o teste literal com acento e a regra de que “Leitura do Estudo” usa membro_id.
4. Os campos de status no schema e nos objetos de partes. Verifique se declined invalida somente a vaga correspondente e se tratar pending como designado faz sentido para o objetivo de cobertura.
5. A lista exata das funções de Apoio no editor, a regra de sábado/domingo, a ausência de VIDEO no formulário e a compatibilidade de helpers compartilhados com o código atual.
6. As constraints de discursos e se contar datas distintas na agenda local atende às decisões do usuário.
7. O filtro de limpeza desde a segunda-feira atual, inclusive quando a limpeza de quarta já passou mas a de sábado ainda é futura; examine também o tratamento de linhas com data_inicio fora de segunda.
8. A estabilidade da paginação range em lotes de 500 para cada tabela, as ordenações quando há empate e a consulta adicional quando a última página vem cheia.
9. As políticas RLS e se os perfis que veem cada cartão podem executar as consultas propostas.
10. O markup do cartão: botão do selo como irmão do Link, tooltip por hover/foco/toque, acessibilidade e ausência de navegação ao tocar.
11. Se os estados de loading, zero e falha parcial e as regras de atualização ao retornar à página ou mudar o dia estão suficientemente definidos.
12. Se os critérios de aceite são possíveis com constraints reais do banco e cobrem limites importantes.

Entregue:
- conclusão explícita: pronto para implementação ou ainda precisa de revisão;
- achados classificados em bloqueador, alto, médio ou baixo, com arquivo e linha;
- pressupostos que o repositório não permite confirmar;
- correções recomendadas ao plano em ordem de prioridade;
- itens verificados sem problemas.

Não implemente mudanças. Não repita recomendações antigas sem conferir se esta versão já as resolveu. Se algum ponto não puder ser confirmado, marque-o como não verificado.
