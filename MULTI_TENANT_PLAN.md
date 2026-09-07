# Guia Tecnico — Multi-Congregacoes (Codigo por Congregacao + Chave por Aparelho)

> Status: PLANEJADO — nao implementar agora. Guardado para retomar depois.
> Revisao: 2026-09-03. Substitui o plano antigo generico pelo que foi decidido em conversa.

## 0. Decisao fechada

1. Sem e-mail/senha por congregacao. Cada congregacao tem 1 codigo curto (PREFIXO-XXXXXX, 6 simbolos, 31^6 = ~887M combinacoes, ver secao 3).
2. Codigo ativa uma vez, depois vale a chave do aparelho (device_token em cookie HttpOnly). O codigo NAO fica salvo no celular.
3. O SISTEMA INTEIRO exige aparelho ativado — inclusive quadro de anuncios, programacao, escalas e dados gerais. Sem cookie valido de device_token, qualquer rota publica redireciona para /ativar.
4. Aparelho ativado abre conteudo GERAL sem escolher nome. Nome selecionado abre o contexto PESSOAL de leitura; PIN INDIVIDUAL do membro, escopado ao tenant, e obrigatorio para escritas pessoais (relatorios, ausencias, confirmacoes e pioneiro) e para reconhecer um aparelho como dele. Supabase Auth abre areas ADMINISTRATIVAS. Tres niveis distintos, sem mistura.
5. Area sensivel continua com login individual (Supabase Auth + membro_perfis). Token do aparelho NAO abre /admin.
6. Tudo que existe hoje vira automaticamente da congregacao Guaira. Ninguem recadastra nada.

## 1. Ponto de partida real

- Banco single-tenant sem congregacao_id.
- Home via RPCs SECURITY DEFINER em 20260901_120006 (listar_membros_publicos, obter_designacoes_publicas_membro, verificar_pin global).
- Auth admin: AuthProvider (membros.user_id -> membro_perfis) + middleware bloqueando /admin, /anciaos, /responsabilidades, /administracao.
- Menu em lib/menuConfig.ts. ADMIN e COORDENADOR com mesma visao.
- dados_congregacao linha unica (20260901_120002) vira legado, migrar para tabela congregacoes.


## 2. Banco de dados

### 2.1 congregacoes
- id UUID PK, nome TEXT, slug UNIQUE (guaira), codigo_hash TEXT (bcrypt, nunca texto puro), codigo_prefixo TEXT (GUAI), ativa BOOL, created_at/updated_at.
- Codigo exibido: PREFIXO-XXXXXX (ex: GUAI-4821KQ). Alfabeto sem 0/O e 1/I/L = 31 simbolos, 31^6 = ~887M combinacoes + rate-limit em 2 niveis (secao 3).
- Guaira e o tenant inicial (slug guaira), recebe todo dado legado.

### 2.2 dispositivos_congregacao
- id UUID PK, congregacao_id FK cascade, token_hash UNIQUE (SHA256 do device_token), apelido TEXT (Celular da Dona Maria), ultimo_uso_at, revogado BOOL default false, created_at.
- device_token gerado no server, devolvido 1 unica vez em HTTPS, nunca logado.
- Revogar = revogado=TRUE. Trocar codigo NAO derruba aparelhos ativos.

### 2.3 dispositivos_membros (novo, vinculo opcional por pessoa)
- dispositivo_id FK dispositivos_congregacao cascade, membro_id FK membros cascade, identificado_em, ultimo_uso_at, sinalizado_em NULL, PRIMARY KEY (dispositivo_id, membro_id).
- O vinculo so e criado ou atualizado apos PIN individual valido para aquele membro; escolher um nome nunca cria vinculo.
- Um aparelho pode ser compartilhado por varios membros e um membro pode reconhecer varios aparelhos. Trigger valida que dispositivo e membro pertencem a mesma congregacao.
- O membro ve, apos validar seu PIN, a quantidade e a lista resumida de aparelhos reconhecidos (apelido, primeiro/ultimo uso). Se nao reconhecer algum, marca como suspeito; isso sinaliza os anciaos, sem bloqueio ou revogacao automatica.

### 2.4 congregacao_id — inventario completo (Fase 0 obrigatoria)

Tabelas que GANHAM `congregacao_id` (direto):
membros, grupos_servico, programacao_semanal, designacoes_suporte, historico_designacoes, escalas_campo, escala_limpeza, relatorios_servico, ministerio_logs, eventos, agenda_anciaos, pauta_anciaos, horarios_campo, territorios, visitas_ativas, historico_conclusao, colaboradores_externos, membro_ausencias, visita_config, agenda_discursos_locais, agenda_discursos_fora, membros_temas, assistencias_reunioes, pioneiro_atividades, pioneiro_transferencias, pioneiro_atividade_historico, pioneiro_ocorrencias_estudo.
(Removidas da lista: `designacoes` e `partes_reuniao` — dropadas em 007_cleanup_unused_tables.sql, substituidas pelo JSONB `partes` em programacao_semanal.)

Tabelas que herdam por JOIN (NAO ganham coluna propria, validam via pai):
membro_perfis (via membros), historico de confirmacao de designacao (via programacao/designacao pai).

Notas de modelagem a decidir na Fase 0:
- `temas`: catalogo oficial de discursos, GLOBAL (mesmo numero/titulo para todas). Nao tenantizar, so referenciar.
- `oradores_visitantes`: por definicao sao de fora, mas o REGISTRO pertence a congregacao que cadastrou — tenantizar pelo vinculo de quem cadastrou, nao pela pessoa.
- `colaboradores_externos`: mesmo criterio acima.
- `visita_config`: 1 por congregacao por visita do superintendente — tenantizar e unique (congregacao_id, programacao_id).
- `dados_congregacao` (linha unica) vira legado: migrar colunas para `congregacoes` e dropar depois do cutover.

### 2.5 Constraints unicas globais (voltaram — sem isso 2 congregacoes colidem)
Antes do cutover, converter para compostas com tenant:
- programacao_semanal.data_reuniao UNIQUE -> UNIQUE (congregacao_id, data_reuniao)
- escala_limpeza.data_inicio UNIQUE -> UNIQUE (congregacao_id, data_inicio)
- assistencias_reunioes (data, tipo) -> UNIQUE (congregacao_id, data, tipo)
- designacoes_suporte (data, funcao) -> UNIQUE (congregacao_id, data, funcao)
- visita_config (programacao_id) -> UNIQUE (congregacao_id, programacao_id)
Fazer com DROP + ADD CONSTRAINT na janela do cutover, apos backfill.

### 2.6 Storage mapas-territorios
Bucket hoje com leitura publica — vaza mapas entre congregacoes. No cutover: tornar privado, organizar objetos por tenant (prefixo <congregacao_id>/...), remover policy publica, entregar arquivos somente via Route Handler que valida o cookie do dispositivo e gera signed URL curta. Inventariar na Fase 0 todos os usos de getPublicUrl/upload.

### 2.7 Propagacao (o maior risco — nao e so ADD COLUMN)
Toda escrita precisa carregar congregacao_id, inclusive indireta:
- Triggers com validacao cross-tenant: validar_designacao_suporte, validar_discurso_sem_conflito, validar_programacao_sem_conflito, validar_escala_campo_sem_ausencia, trg_sync_is_sg — cada uma confere que filho e pai sao do mesmo tenant e rejeita cross-tenant. (`set_updated_at` NAO precisa: so atualiza updated_at na dados_congregacao, que vira legado.)
- RPCs de escrita: salvar_designacoes_suporte, enviar_relatorio_viamembro/viapin, salvar/listar/excluir_log_pioneiro, salvar/listar/excluir/atualizar_minhas_ausencias, obter_conflitos_ausencia, salvar_configuracao_pioneiro, atualizar_membro_grupo, obter/responder_confirmacao_designacao — todas ganham versao v2 com device_token, do qual a RPC deriva congregacao_id; escritas pessoais tambem validam o PIN do membro. Fluxos autenticados derivam o tenant de auth.uid(). Nenhuma RPC recebe congregacao_id como autoridade vinda do client.
- Server actions: autoAssign, autoAssignSupport, saidas.actions, territorios.actions, restore.actions, auth.actions (link user->membro precisa conferir tenant), api/pioneer/* (ATENCAO: usa createAdminClient/service role que BYPASSA RLS — o .eq(congregacao_id) ali e a UNICA barreira, validar em dobro) — todo .from() ganha .eq(congregacao_id) derivado do servidor, nunca do client.
- Regra: nenhum INSERT aceita congregacao_id do client sem validar contra dispositivo (anon) ou membro do auth (authenticated).

## 3. RPCs (todas SECURITY DEFINER, search_path public, REVOKE PUBLIC, GRANT anon+authenticated)

As RPCs v2 de aparelho sao chamadas SOMENTE por Route Handlers/Server Actions. O browser nao le o cookie HttpOnly, nao recebe o device_token e nao chama essas RPCs diretamente.

### Cliente Supabase do backend
Rotas publicas de aparelho usam o cliente Supabase com anon key e chamam RPCs v2 com o token lido do cookie pelo servidor. Assim, os GRANT EXECUTE para anon permanecem intencionais, mas a RPC so retorna dados apos validar o token. createAdminClient/service_role fica restrito a provisionamento, backup/restauracao e operacoes internas que realmente o exigem; nunca substitui a validacao de dispositivo em rotas publicas.

### ativar_dispositivo(p_codigo TEXT)
Chamada apenas pelo Route Handler de ativacao. Normaliza, confere hash (bcrypt tempo-constante), erro generico Codigo invalido. Rate-limit em 2 niveis: o Route Handler/Edge Function aplica bloqueio progressivo pelo IP confiavel da requisicao (10/hora, depois 1h, depois 24h); a RPC registra/confere limite por prefixo/codigo (max. 30 tentativas/hora por congregacao) em tentativas_ativacao (ip, prefixo, created_at). Codigo com 6 simbolos (PREFIXO-XXXXXX, alfabeto sem 0/O 1/I/L = ~887M combinacoes). Se ok: INSERT dispositivo + RETURN (congregacao_id, slug, nome, device_token) somente ao handler, que grava o token em Set-Cookie HttpOnly.

### validar_dispositivo(p_device_token) — interna
Confere token_hash + revogado=FALSE + congregacao ativa e RETORNA congregacao_id. Falha = 42501. O tenant e sempre derivado desse resultado, jamais informado pelo browser.

### listar_membros_publicos_v2(p_device_token)
Chamada pelo backend. Mesmo retorno da v1 + WHERE congregacao_id = validar_dispositivo(token) AND ativo=TRUE. A v1 permanece apenas para compatibilidade durante a Fase A e nunca e usada como fallback por rotas publicas ja migradas.

### obter_designacoes_publicas_membro_v2(p_membro_id, p_device_token)
Chamada pelo backend. Copia corpo da v1 (120006) adicionando filtro de congregacao_id derivado do token em cada ramo. Janela 21 dias. Valida que membro pertence ao tenant.

### validar_pin_membro_v2(p_membro_id, p_pin, p_device_token)
Chamada pelo backend antes de toda escrita pessoal. Deriva o tenant do token, valida que o membro pertence a ele e confere o PIN individual armazenado como hash. PINs podem se repetir entre membros e entre congregacoes; nunca ha busca global por PIN. Rate-limit por dispositivo + membro impede tentativas repetidas. Em sucesso, cria/atualiza o vinculo em dispositivos_membros e devolve apenas o contexto necessario para a operacao.

### Relatorios e pioneiro
enviar_relatorio_viapin e salvar/listar/excluir_log_pioneiro passam a exigir (device_token + membro_id + PIN individual) no ambiente ativado, derivando congregacao_id do token e validando o membro. A assinatura global por PIN fica apenas na compatibilidade pre-cutover.

## 4. Frontend

### lib/tenantDevice.ts (novo)
Estrategia unica: device_token em cookie HttpOnly via route handler /api/dispositivo (server-side le e repassa para RPCs). NADA de token em localStorage. localStorage guarda so { congregacao_id, slug, nome } (nao sensivel) para exibicao. Justificativa: token em JS e bearer roubavel por XSS; cookie HttpOnly + SameSite=Lax reduz superficie. Server actions e route handlers leem o cookie, nunca o client.

### GET /api/dispositivo/status (novo)
O client consulta este endpoint apenas para estado de interface. Ele le e valida o cookie no servidor e retorna somente { ativado, congregacao_id, slug, nome }, com Cache-Control: no-store, sem expor device_token. TenantDevice/localStorage e essa resposta nao sao prova de autorizacao: cada rota, endpoint e RPC valida o cookie novamente no servidor.

### app/ativar/page.tsx (nova, publica)
1 campo codigo, teclado grande. Faz POST para o Route Handler /api/dispositivo/ativar; ele chama ativar_dispositivo, grava o cookie HttpOnly via Set-Cookie e redireciona para /. Sem dispositivo, rotas publicas redirecionam para /ativar. /login e /admin seguem fluxo Auth.

### Quadro e conteudo geral (decisao: tudo exige aparelho ativado)
O quadro de anuncios, programacao, escalas, limpeza, territorios e demais dados gerais DEIXAM de ser leitura anonima direta. Revertem-se conscientemente as policies/grants anon restaurados em 20260902_120009 (e 120007 para ministerio_logs). Fluxo novo:
1. Route Handler ou Server Action le o cookie HttpOnly, valida o dispositivo (token_hash + revogado + congregacao ativa) e deriva congregacao_id NO SERVIDOR.
2. O client nunca envia congregacao_id confiavel nem toca no device_token.
3. Fase B: migrar TODAS as leituras .from() anonimas (~68 arquivos: quadro, programacao, escalas, limpeza, territorios, saidas, eventos, calendario) para endpoints do backend. Somente esses endpoints chamam RPCs v2 com validacao de dispositivo.
4. Cutover: remover fallback publico das RPCs v1 — sem aparelho ativado nao ha acesso.

### HomeMemberSearch.tsx
Troca chamadas v1 por endpoint backend que usa a v2 com cookie HttpOnly. Erro 42501 = Aparelho desconectado, fale com o responsavel + botao Trocar de congregacao (limpa dados locais e cookie via endpoint -> /ativar).

### PinLoginModal.tsx
Se tem TenantDevice, nao pede PIN, vai direto ao nome. Se nao tem, cai em /ativar.

### membro_sessao
Passa a guardar congregacao_id. Se sessao.congregacao_id != dispositivo.congregacao_id, descarta e pede so nome. Esta sessao e somente estado de interface: toda escrita exige PIN individual validado pelo backend, mesmo que o nome ja esteja selecionado.

### Auth e escopo administrativo (3 niveis, sem ambiguidade)
- NIVEL 1 SUPORTE_GLOBAL: perfil ADMIN cujo membro pertence a congregacao especial de suporte (ou flag is_suporte_global). Unico que ve todas. Uso: criar nova congregacao, emergencia. Nunca e o coordenador local.
- NIVEL 2 GESTAO_LOCAL: ADMIN_LOCAL (todo ADMIN sem flag de suporte) e COORDENADOR_LOCAL, ambos vinculados a 1 congregacao via membros.congregacao_id. Veem e editam SO a sua. Tela /administracao/acesso filtra sempre por tenantAdminId.
- NIVEL 3 DEMAIS PERFIS: SECRETARIO, SS, RESP_* etc., sempre escopados ao proprio tenant. has_role() passa a conferir tenant: has_role(p_perfil) retorna TRUE so se perfil existe E membro.congregacao_id = tenant derivado de auth.uid().
- AuthProvider inclui membros.congregacao_id no select, guarda tenantAdminId + isSuporteGlobal. Queries /admin ganham .eq(congregacao_id, tenantAdminId) salvo se isSuporteGlobal. hasRole e menuConfig inalterados na UX.

### Nova congregacao (provisionamento)
1. SUPORTE_GLOBAL cria congregacoes (nome, slug, gera codigo 1 vez) + cria 1 membro ADMIN vinculado + convite Auth para esse membro.
2. Seed automatico: grupos_servico padrao (ex: Grupo 1), horarios_campo padrao, visita_config vazia. Copiar de template, nunca compartilhar linhas entre tenants.
3. Primeiro ADMIN local troca codigo no primeiro acesso (/administracao/acesso).
4. Migracao de relacoes: membro_perfis, membros_temas etc. seguem membro_id, logo herdam tenant automaticamente — validar com query de orfaos antes do cutover.

## 5. Tela Admin/Coordenador — /administracao/acesso
Novo item em ADMINISTRACAO_GROUP, allowedRoles ADMIN+COORDENADOR (coordenador filtra pelo proprio tenant, global escolhe tenant por select).
Secao Codigo: mascarado + Mostrar + Gerar novo codigo (exibe 1 vez, hash no banco, aparelhos ativos continuam).
Secao Aparelhos: lista por ultimo_uso_at DESC com apelido editavel, criado em, ultimo uso, Bloquear/Desbloquear. Bloqueado cai para /ativar.

## 6. Execucao em 4 fases (app sempre no ar)
Fase 0 inventario (antes de tudo): listar tabelas/RPCs/triggers/actions acima, decidir temas global (fechado: GLOBAL), definir 3 niveis admin, criar queries de orfaos, inventariar TODAS as leituras .from() anonimas diretas (~68 arquivos) + usos de storage getPublicUrl/upload, mapear constraints unicas a converter, migrar PIN global em texto para PIN individual com hash e inventariar operacoes pessoais de escrita.
Fase A banco compativel: congregacoes + Guaira, ADD NULL + backfill + indices, dispositivos, RPCs v2 sem remover v1.
Fase B app compativel: tenantDevice (cookie HttpOnly) + /ativar + migracao das rotas publicas para endpoints backend/v2, sem fallback publico para v1 + tela acesso. Validar com 2 congregacoes de teste.
Fase C cutover 30-90min: backup, zerar nulos, NOT NULL, RLS final, exigir device_token, republicar sem fallback, checklist. Rollback = policies/RPCs + versao anterior.

## 7. RLS final (resumo)
anon: sem select direto em NENHUMA tabela operacional nem storage — so EXECUTE em ativar_dispositivo e nas RPCs v2 (que validam dispositivo). Reverte 120009/120007. authenticated admin: USING (congregacao_id = (SELECT congregacao_id FROM membros WHERE user_id = auth.uid())) + has_role existente (que passa a conferir tenant). ADMIN global (suporte) bypass para manutencao. congregacoes: select do proprio tenant; anon so via ativar_dispositivo. Ao escrever v2, copiar da ULTIMA definicao de cada RPC (ha redefinicoes: enviar_relatorio_viapin em 3 arquivos, validacoes de ausencia em 120010/120011/120013/120014).

## 8. Testes antes do cutover (por tabela e RPC, nao so Home)
1 Codigo A nao ativa B. 2 Token A nao lista B. 3 Mesmo nome nas duas nao cruza. 4 Relatorio grava tenant certo. 5 Revogado cai para /ativar com msg leiga. 6 Troca de codigo nao derruba ativos. 7 Auth de A tentando .eq(congregacao_id=B) via client e bloqueado pelo RLS (teste adversarial direto no Supabase). 8 Para CADA tabela tenantizada: insert cross-tenant rejeitado por trigger/RLS. 9 Para CADA RPC v2: chamada com token de outro tenant retorna 42501. 10 localStorage/cookie limpo volta para /ativar sem suporte. 11 Nenhuma chamada .from() anonima restante retorna dado operacional; sem cookie, toda rota geral redireciona para /ativar. 12 Dispositivo A nao obtem signed URL nem arquivo de mapas-territorios de B. 13 Duas congregacoes inserem registros na mesma data nas antigas constraints globais sem colisao. 14 PIN valido de A nao permite escrita nem confirmacao em nome de B. 15 Escolher nome sem PIN nao cria vinculo dispositivo-membro; PIN valido cria ou atualiza apenas o vinculo do proprio membro. 16 Membro ve somente seus aparelhos reconhecidos e marcar aparelho suspeito nao bloqueia automaticamente.

## 9. Descartado
E-mail/senha por congregacao: conta compartilhada derruba todos, sessao instavel (vide RESUMO.md), digitacao dificil, nao dispensa RLS. PIN GLOBAL por pessoa no ambiente ativado: atrito + colisao global; PIN INDIVIDUAL escopado ao tenant permanece somente para escritas pessoais e reconhecimento de aparelhos. dados_congregacao linha unica vira legado.
