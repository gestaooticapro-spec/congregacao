# Planejamento de Funcionalidades Futuras

Este documento detalha funcionalidades prioritárias discutidas e validadas tecnicamente, que devem ser preservadas e implementadas para a evolução do sistema.

## 1. Gestão de Ausências (Indisponibilidades)

### Objetivo
Permitir que os membros notifiquem períodos em que estarão ausentes, garantindo que não recebam designações conflitantes e que os responsáveis sejam alertados sobre designações já existentes.

### Requisitos Funcionais
- **Registro de Período**: O usuário informa uma data de início e uma data de fim para sua ausência.
- **Validação de Conflitos Existentes**: Ao registrar a ausência, o sistema deve varrer as tabelas de designações (`programacao_semanal`, `designacoes_suporte`, `escalas_campo`) para identificar se o membro já possui tarefas no período e emitir um alerta imediato.
- **Bloqueio de Novas Designações**: O nome do membro deve ser automaticamente excluído de qualquer lista de seleção (dropdowns) para novas designações que ocorram dentro do período de ausência registrado.

### Especificações Técnicas
- **Tabela**: `indisponibilidades`
  - `id` (UUID), `membro_id` (FK), `data_inicio` (DATE), `data_fim` (DATE), `motivo` (TEXT/Optional), `created_at` (TIMESTAMPTZ).
- **Lógica de Interface**: Integrar a verificação de conflitos no helper `lib/conflictCheck.ts` para incluir a tabela de indisponibilidades.

---

## 2. Identificação e Acesso via PIN

### Objetivo
Prover uma forma de identificação simples para membros que não possuem login completo por e-mail, permitindo que acessem suas informações e realizem ações (como enviar relatórios) de forma rastreada.

### Fluxo de Experiência do Usuário
1. **Identificação**: Na área pública, o usuário encontra uma tela de "Acesso Rápido".
2. **Seleção de Perfil**: O usuário seleciona seu nome a partir da lista oficial de membros cadastrados no banco de dados.
3. **Autenticação via PIN**: O sistema solicita um PIN numérico (previamente cadastrado pelo administrador na ficha do membro).
4. **Boas-Vindas e Sessão**: Com as credenciais corretas, o usuário recebe uma mensagem de boas-vindas e ganha acesso às suas designações e formulários de relatório.
5. **Persistência**: Para evitar a redigitação constante, o PIN e a identificação devem ser salvos no dispositivo pessoal (LocalStorage ou Cookie persistente).

### Especificações Técnicas
- **Tabela `membros`**: Adicionar coluna `pin` (TEXT).
- **Rastreabilidade**: Todas as ações realizadas via PIN (ex: envio de relatórios) devem carimbar o `membro_id` correspondente, garantindo a integridade dos dados históricos.
- **Segurança**: Embora o PIN seja uma segurança simplificada para uso cotidiano, as funções sensíveis (área `/admin`) continuam exigindo login completo por e-mail/senha.

---

## 3. Visita do Superintendente de Circuito

### Objetivo
Gerenciar a semana especial da visita do Superintendente de Circuito (SC), centralizando formulários e ajustes automáticos na rotina da congregação.

### Requisitos Funcionais
- **Formulários Específicos**:
  - **Programação de Refeições**: Escala de irmãos que hospedarão o SC e sua esposa para almoço e jantar.
  - **Programação de Estudos Bíblicos**: Escala de estudos acompanhados pelo SC e pela esposa do SC.
  - **Programação de Pastoreio**: Registro de visitas de pastoreio que o SC realizará com os anciãos.
  - **Pauta de Reunião com Anciãos**: Lista de assuntos específicos para a reunião com o corpo de anciãos e servos ministeriais durante a visita.

- **Mudanças na Rotina das Reuniões**:
  - Detecção automática da "Semana da Visita" com base em datas.
  - Substituição de partes tradicionais pelos discursos do SC na programação semanal.
  - Inclusão de reuniões extras no cronograma (Reunião com Pioneiros, Reunião com Anciãos e Servos).

### Visão de Implementação
- Criação de um "Painel da Visita" centralizado para evitar dispersão de dados.
- Funcionalidade de exportação/impressão do cronograma completo para entrega manual ao Superintendente.

---
> [!IMPORTANT]
> **ESTE ARQUIVO NÃO DEVE SER APAGADO OU SOBRESCRITO.** Ele contém a memória técnica de funcionalidades essenciais para a operação da congregação.
