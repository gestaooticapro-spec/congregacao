# Implementação: calendário de pastoreio

Roteiro para a tela `/admin/pastoreio`. Não descreve o que já foi feito. É o que implementar.

O calendário mostra as próximas visitas já gravadas no banco, no mesmo espírito de `/admin/agenda`: mês, setas, dia de hoje, clique no dia. Agendar e confirmar continuam na lista do grupo.

## Escopo

Entra:

- Aba Calendário como visão inicial de `/admin/pastoreio`.
- Aba Grupo com a lista que já existe.
- Grade do mês a partir de `membros.proxima_visita` já salva.
- Modal do dia e retorno para a linha do membro.

Fica de fora, de propósito:

- Histórico de várias visitas, hora da visita, tabela nova, migration e mudança de policy.
- Calendário do corpo de anciãos e mistura de grupos.
- Criar ou remarcar clicando num dia vazio.
- `visita_config.pastoreios` (`components/visita/TabArranjos.tsx`).
- `CalendarGrid`, `EventList`, `EventModal`, `PageHeader`, menu e permissões.
- A query que escolhe o grupo e os membros.

## Arquivos

Criar:

- `lib/pastoreioDates.ts` — data civil e atraso. Sem React.
- `components/pastoreio/PastoreioCalendar.tsx` — barra de mês e grade.
- `components/pastoreio/PastoreioDayModal.tsx` — detalhe do dia.

Editar só `app/admin/pastoreio/page.tsx`.

## Dados que a tela já tem

A página não consulta `canAccessPastoreio`. O menu usa esse flag. O middleware de `/admin` só exige login. A página faz a checagem abaixo e, se falhar, manda para `/`.

Ordem real, que esta entrega não altera:

1. Membro logado: `membros` por `user_id`, campos `id`, `nome_completo`, `grupo_id`, `is_sg`, `is_ajudante`.
2. Liderança: `grupos_servico` com `.or(superintendente_id.eq.${id},ajudante_id.eq.${id}).maybeSingle()`. O erro dessa chamada é ignorado.
3. Entra se `is_sg`, ou se é o `superintendente_id` desse único grupo, ou se `is_ajudante`, ou se é o `ajudante_id`.
4. `grupoId = membros.grupo_id` do logado. Só se vier vazio usa o `id` do grupo do passo 2.
5. Sem `grupoId`: toast “Este irmão não possui grupo de serviço vinculado.” A página continua, com lista vazia. Não redireciona.
6. Membros: `select('*')`, `eq('grupo_id', grupoId)`, `neq('id', id do logado)`, `order('nome_completo')`. Não filtra `ativo`.

O trigger `sync_is_sg_on_grupo_change` permite a mesma pessoa em mais de um grupo. Dois resultados fazem o `maybeSingle` falhar. No menu, esse erro zera `canAccessPastoreio` numa sincronização nova. Na página, se `is_sg` ou `is_ajudante` for verdadeiro, a lista cai no `grupo_id`. O calendário mostra exatamente esse array.

Policies deste repositório, sem mudança nesta entrega:

- `membros_select`: `authenticated` com `USING (true)`.
- `anon`: só `id`, `nome_completo`, `nome_civil`, e só `ativo`.
- `membros_update`: só `has_role('ADMIN')` ou `has_role('COORDENADOR')`.

Quem abre a tela lê as datas porque já está autenticado. O calendário só renderiza nome e atraso do array já filtrado. Não renderiza `ultima_visita_obs`. O teste de gravar usa um login que já consegue salvar a lista hoje. Se o `update` falhar, a falha já existe na lista; não é defeito do calendário.

## Duas listas na página

Hoje `handleDateChange` grava `proxima_visita` em `membros` antes do `update`. A grade não pode ler esse array.

Estado na página, que sobrevive ao `loading` de `fetchMembros`:

- `membrosSalvos`: última lista devolvida por `fetchMembros`. Só ela alimenta grade, modal, aviso do topo e borda de atraso da linha.
- `membros`: cópia editável. `handleDateChange` altera só esta. O `value` do input lê esta.
- `observacoes`: como hoje. Não desce para um filho que desmonta.
- `mes`: `{ year, month }` com `month` de 1 a 12. Nasce de `getCongregationDate()`, não de `new Date()`.
- `aba`: `'calendario' | 'grupo'`. Valor inicial `'calendario'`.
- `diaAberto`: `yyyy-MM-dd` ou `null`.
- `scrollParaId`: id do membro ou `null`.

`fetchMembros` faz `setLoading(true)` e o `return` antecipado desmonta a grade. Por isso `mes`, `aba`, rascunhos e `observacoes` ficam no estado da página, não dentro de `PastoreioCalendar`.

No sucesso do fetch, `setMembros` e `setMembrosSalvos` recebem a mesma lista nova. Um rascunho de data ainda não salvo se perde nesse refetch, como já acontece hoje. `observacoes` permanecem, exceto a do membro recém-confirmado, que a página já apaga.

`handleSaveDate` envia a data da cópia editável. No erro, a cópia editável fica com o rascunho e `membrosSalvos` não muda. No sucesso, o fetch substitui as duas. A grade muda só depois disso.

`handleSalvarVisita` permanece com o payload atual: `ultima_visita` = `getCongregationDate()`, `ultima_visita_obs`, e `proxima_visita: null` só quando a cópia editável tem data. Não aproveitar este trabalho para mudar essa condição.

O aviso do topo deixa de ser calculado dentro do fetch. Um `useMemo` filtra `membrosSalvos` com `isVisitaAtrasada`.

A borda vermelha, o ícone e o texto para leitor de tela usam o membro de `membrosSalvos` com o mesmo `id`, não a data que está no input. Durante o rascunho, o valor digitado e a borda podem divergir. Aviso, borda, grade e modal concordam, porque os quatro leem a data salva.

## Data e atraso

Tudo em texto `yyyy-MM-dd`. Não usar `new Date('yyyy-MM-dd')`, `isOverdue`, `subDays(new Date(), 2)` nem `isSameDay(..., new Date())`.

`lib/pastoreioDates.ts`:

- `isYmd(value)`: verdadeiro só para `/^\d{4}-\d{2}-\d{2}$/`.
- `addCalendarDays(ymd, days)`: separa ano, mês e dia, soma em `Date.UTC(ano, mês - 1, dia + days)`. O UTC aqui é só aritmética de calendário. O retorno é a string `` `${ano}-${mês}-${dia}` ``, com `ano = getUTCFullYear()`, `mês = getUTCMonth() + 1` e `dia = getUTCDate()`. Mês e dia têm dois dígitos. `2026-03-01` menos 1 dia é `2026-02-28`, nunca `2026-2-28`. Sem o zero à esquerda, a comparação de string deixa de ser ordem civil: `2026-11-10` não é maior que `2026-11-3`.
- `isVisitaAtrasada(proxima, ultima, hoje)`:
  - falso se `proxima` ou `hoje` não forem `yyyy-MM-dd`;
  - falso se `proxima` for maior que `addCalendarDays(hoje, -2)`;
  - verdadeiro se `ultima` não for `yyyy-MM-dd`;
  - verdadeiro se `ultima < proxima`;
  - falso se `ultima >= proxima`.

A comparação é de string. Para esse formato, a ordem lexicográfica é a ordem civil. A regra é a do aviso atual, inclusive o empate: data igual a hoje menos 2 dias conta; `ultima` igual a `proxima` não conta.

`hoje` em cada render da página é `getCongregationDate()` (`America/Sao_Paulo`). Sem `setInterval`. Uma virada de meia-noite com a tela parada só aparece no próximo render.

Apagar `isOverdue` e `OVERDUE_THRESHOLD` da página. A linha, o aviso, a grade e o modal chamam `isVisitaAtrasada`.

Exemplos que a função tem de cumprir:

| hoje | proxima | ultima | resultado |
| --- | --- | --- | --- |
| 2026-11-12 | 2026-11-10 | null | atrasada |
| 2026-11-12 | 2026-11-11 | null | em dia |
| 2026-11-12 | 2026-11-10 | 2026-11-10 | em dia |
| 2026-11-12 | 2026-11-10 | 2026-11-09 | atrasada |
| 2026-11-12 | 2026-11-10T00:00:00 | null | fora da grade e não atrasada |
| 2026-01-01 menos 2 dias | | | 2025-12-30 |
| 2026-03-01 menos 1 dia | | | 2026-02-28 |

`formatDateBR` continua com `parseISO`. Esse caminho preserva o dia civil. O modal, para a data por extenso, usa `format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR })`. Não usa `new Date(data)`.

Data inválida ou fora de `yyyy-MM-dd` não entra na grade e conta como membro sem data.

## Cabeçalho e abas

`PageHeader` centraliza o título. `actions` ficam abaixo, centralizados. O controle vai em `actions`. Não alterar `PageHeader` e não colocar o controle ao lado do título.

O controle repete as classes de `/admin/agenda`:

- invólucro `flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg`;
- botão ativo `bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm`;
- botão inativo `text-slate-500 hover:text-slate-700 dark:hover:text-slate-300`;
- rótulos `Calendário` e `Grupo`.

Abaixo do cabeçalho, nas duas abas:

- o aviso âmbar de confidencialidade, como está;
- o alerta vermelho, agora derivado de `membrosSalvos`.

A aba Grupo é a lista atual. Não escurecer a tabela: o nome desktop continua `text-slate-800` sobre `dark:bg-slate-900`.

No celular a “Próxima visita” já é um único input controlado. No desktop, a célula escolhe o ramo pelo `proxima_visita` editável. Com data, o input tem `value` e a classe vermelha. Sem data, o outro ramo é um input sem `value`, sem classe vermelha e sem o ícone. Apagar o rascunho grava `null` e troca de ramo, então a borda some mesmo que a data salva continue atrasada.

No desktop, trocar esse `if` por um único input controlado. `value` é a cópia editável, ou `''` quando ela é `null`. Borda, `AlertTriangle` e o `sr-only` “Visita pendente - remarque a data” chamam `isVisitaAtrasada` do membro em `membrosSalvos`. O botão continua a depender do rascunho: com data editável, o rótulo é “✓” e só desabilita enquanto salva; sem data editável, o rótulo é “Agendar” e fica desabilitado. O resto da tabela não muda.

## Grade

`PastoreioCalendar` recebe `year`, `month` (1–12), `hoje`, as visitas do mês e os callbacks de mês e de dia. Não guarda o mês.

Barra de mês, com o mesmo desenho da página da agenda, dentro deste componente:

- invólucro `flex items-center justify-between mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm`;
- título `text-xl font-bold capitalize`, `format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })`. Esse `Date` é construído com ano, mês e dia numéricos, não com string ISO.

Troca de mês na página:

```ts
const cursor = new Date(year, month - 1 + delta, 1)
// year = cursor.getFullYear(); month = cursor.getMonth() + 1
```

Dezembro mais um cai em janeiro do ano seguinte. O mesmo vale para janeiro menos um.

Grade:

- semana de domingo a sábado: `Dom Seg Ter Qua Qui Sex Sáb`;
- o dia da semana do dia 1 é `new Date(year, month - 1, 1).getDay()`;
- a quantidade de dias é `new Date(year, month, 0).getDate()`;
- colunas `repeat(7, minmax(0, 1fr))`. No Tailwind deste projeto, `grid-cols-7` já gera isso. Cada célula, vazia ou não, leva `min-w-0 overflow-hidden`. Sem isso o nome alarga a coluna;
- célula no ritmo de `CalendarGrid`: `min-h-[80px] md:min-h-[100px]`, borda `border-slate-100 dark:border-slate-700/50`, fundo do quadro `bg-white dark:bg-slate-800`;
- hoje, quando a chave da célula é igual a `hoje`: número em `bg-blue-600 text-white` e fundo `bg-blue-50/30 dark:bg-blue-900/5`;
- dia com visita: `<button type="button">` com `hover:bg-blue-50 dark:hover:bg-blue-900/10`. Dia vazio é `div` e não recebe clique.

Chave da célula: `yyyy-MM-dd` com mês e dia em dois dígitos. Visitas do dia: itens de `membrosSalvos` cuja `proxima_visita` é igual a essa chave. A ordem é a da query, `nome_completo`. O nome exibido é `nome_civil || nome_completo`, inteiro, sem extrair primeiro nome.

Conteúdo da célula:

- abaixo de `md`: uma bolinha e a quantidade de visitas do dia. A bolinha é `bg-red-500` se qualquer uma estiver atrasada; senão `bg-blue-500`. Os nomes ficam `hidden`;
- de `md` para cima: no máximo dois nomes, cada um com `min-w-0 truncate` e `text-slate-700 dark:text-slate-300`. Uma bolinha de 6px antes de cada nome, vermelha ou azul conforme aquela pessoa. Se houver mais de dois, `+N` com o restante. Sem o alfinete do calendário de eventos.

Mês sem visita salva naquele mês: a grade continua e, abaixo dela, “Nenhuma visita agendada neste mês.”

Rodapé:

- se `membrosSalvos.length === 0`: “Nenhum membro neste grupo.”;
- se houver membro cuja `proxima_visita` salva não é `yyyy-MM-dd`: “N membros sem data” e um botão que faz `setAba('grupo')`. Sem `id` de scroll;
- zero membros sem data: o rodapé de contagem não aparece.

## Modal

Não reutilizar `EventModal`. Ele exige `titulo`, `tipo` e `data_inicio`, e não fecha no fundo nem no Escape.

`PastoreioDayModal`:

- overlay `fixed inset-0 z-50` com clique no fundo fechando;
- o painel para o clique, para não fechar ao usar por dentro;
- `role="dialog"` e `aria-modal="true"`;
- Escape no `document`, removido no unmount;
- botão Fechar;
- título com a data por extenso, via `parseISO`;
- uma linha por visita, nome completo, e o texto “Atrasada” só na pessoa atrasada;
- não mostrar observação, hora, ancião nem endereço;
- “Ver na lista” chama o callback da página e fecha.

A página, nesse callback:

1. `setAba('grupo')`;
2. `setScrollParaId(id)`;
3. `setDiaAberto(null)`.

O scroll não acontece no handler do clique. A lista do grupo só está no DOM com a aba Grupo. Um `useEffect` depende de `aba` e `scrollParaId`. Quando os dois estão prontos, escolhe o alvo visível e chama `scrollIntoView({ block: 'center', behavior: 'smooth' })`. Depois zera `scrollParaId`.

Alvos, um por bloco, sem repetir `id`:

- cartão: `pastoreio-card-${id}`, no bloco `md:hidden`;
- linha: `pastoreio-row-${id}`, no bloco `hidden md:block`.

A escolha usa `window.matchMedia('(min-width: 768px)')`, o mesmo corte do `md` do Tailwind. No desktop rola a linha. No celular rola o cartão. `getElementById` no primeiro bloco falha no desktop porque esse bloco está `display: none`.

## Verificação no navegador

Não há teste automatizado desta página. Conferir com um login que já abre `/admin/pastoreio` e já consegue salvar uma data na lista.

1. A aba inicial é Calendário. O controle fica abaixo do título, centralizado.
2. O mês inicial é o mês civil de `America/Sao_Paulo`. O dia de hoje usa esse mesmo texto, não o fuso do aparelho.
3. Cada `proxima_visita` salva e válida aparece no dia certo. Dois membros no mesmo dia aparecem os dois no modal, na ordem de `nome_completo`.
4. O nome é `nome_civil || nome_completo`. No celular, uma bolinha e a quantidade, sem a grade estourar a largura. De `md` para cima, dois nomes truncados e `+N`.
5. Data exatamente dois dias antes de hoje, sem `ultima_visita` que a cubra, fica vermelha na grade, no modal, na borda da linha e no aviso. `ultima` igual a `proxima` não fica vermelha em nenhum desses quatro.
6. Mês anterior e seguinte, inclusive janeiro e dezembro. Mês sem visitas mostra a grade e a frase vazia. Datas noutro mês não aparecem nesse mês.
7. Digitar uma data sem clicar em salvar não move a grade, não muda o aviso e não muda a borda. Apagar o input no desktop não troca de ramo: o campo continua controlado, a data salva permanece na grade e, se essa data salva estiver atrasada, borda, ícone e texto para leitor de tela continuam. Salvar e voltar ao calendário mostra a data nova. Confirmar a visita tira o dia.
8. “Ver na lista” abre a aba Grupo e rola a linha visível no desktop e o cartão no celular. Não há `id` repetido no DOM.
9. Uma observação digitada e não salva continua no campo depois de ir ao calendário e voltar.
10. O popover da última visita abre na lista como hoje. O modal do dia não mostra `ultima_visita_obs`.
11. Membro inativo que já vem na lista também vem na grade. O próprio logado continua de fora.
12. Grupo sem membros: frase do rodapé, sem quebra. `is_sg` sem `grupo_id` e sem um único grupo de liderança: toast atual e tela vazia, sem redirect novo.
13. `proxima_visita` que não seja `yyyy-MM-dd` fica fora da grade e entra na contagem “sem data”.
14. Tema escuro na barra de mês, na grade e no modal: fundo `dark:bg-slate-800`, texto `dark:text-slate-300`, número de hoje `bg-blue-600 text-white`.
15. Irmão que não é superintendente nem ajudante continua indo para `/`.
16. `/calendario` e `/admin/agenda` permanecem iguais.

## Não fazer nesta entrega

- Não corrigir o fato de a confirmação zerar `proxima_visita` olhando a cópia editável.
- Não fazer o refetch preservar rascunho de data.
- Não filtrar inativo, não incluir o logado e não trocar a precedência `grupo_id` / `maybeSingle`.
- Não escurecer a tabela desktop. A única mudança nessa tabela é o input único de “Próxima Visita”, descrito acima.
- Não abrir policy nova para o superintendente gravar `proxima_visita`.
