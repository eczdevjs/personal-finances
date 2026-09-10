# Documentação do Banco de Dados: Despesas Recorrentes

## Visão Geral
Para automatizar o lançamento de despesas fixas/recorrentes (ex: aluguel, assinaturas, contas de luz), optamos por colocar a lógica de geração de registros em uma **Stored Procedure no PostgreSQL**, invocada periodicamente pela aplicação Node.js.

---

## Architecture Decision Record (ADR): Por que Stored Procedure?
- **Motivação:** Garantir performance e atomicidade no banco de dados para a criação em massa de despesas de todos os usuários.
- **Alternativas consideradas:** Iteração individual no Node.js via ORM/Knex.
- **Decisão:** A procedure reduz o tráfego de rede (uma única chamada para o banco) e executa dentro de uma transação SQL nativa.

---

## Stored Procedure: `generate_monthly_expenses()`

### 1. Frequência de Execução
- **Agendador:** Node.js Cron Job (`node-cron`).
- **Cron Pattern:** `0 0 1 * *` (Todo dia 1º de cada mês às 00:00 UTC).
- **Chamada via Knex:** `await db.raw('CALL generate_monthly_expenses()');`

### 2. Comportamento e Regras de Negócio
1. Varre a tabela `recurring_expenses` buscando despesas ativas (`active = true`).
2. Para cada registro, insere uma nova linha na tabela `expense` configurando:
   - Data de Vencimento (`due_date`): Calculada para o mês vigente mantendo o dia original.
   - Status de Pagamento (`payment_status`): Inicia como 'Pendente' / 'Vincenda'.
3. Evita duplicidade usando restrição única ou verificação prévia de existência no mês atual.

### 3. Exemplo do DDL (Script SQL)
```sql
CREATE OR REPLACE PROCEDURE generate_monthly_expenses()
LANGUAGE plpgsql
AS $$ BEGIN     INSERT INTO expense (name, amount, due_date, payment_method_id, payment_status, user_id)     SELECT          re.name,          re.amount,          MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, re.due_day),         re.payment_method_id,         1, -- Status 'Vincenda'         re.user_id     FROM recurring_expenses re     WHERE re.active = true; END; $$;