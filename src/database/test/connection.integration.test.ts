import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import db from '../connection';

describe('Database Integration Smoke Test', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    // Trunca todas as tabelas envolvidas para isolamento completo do teste
    await db.raw('TRUNCATE TABLE expense, users, payment_status, payment_method RESTART IDENTITY CASCADE');
  });

  it('deve conectar ao banco, executar migrações e realizar inserções/buscas com integridade referencial', async () => {
    // 1. Insere dependências e recupera os IDs gerados
    await db.raw(`INSERT INTO payment_status (status) VALUES ('Vincenda'), ('Paga'), ('Atrasada')`);
    await db.raw(`INSERT INTO payment_method (name) VALUES ('Cartão de Crédito'), ('Dinheiro'), ('Cartão de Débito'), ('Pix')`);

    const userResult = await db.raw(
      `INSERT INTO users (name, email) VALUES (?, ?) RETURNING id`,
      ['Erico', 'eczdevjs@gmail.com']
    );
    const userId = userResult.rows[0].id;

    // 2. Insere a despesa usando o ID dinâmico do usuário
    await db.raw(
      `INSERT INTO expense (name, amount, due_date, payment_method_id, payment_status, user_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Groceries', 150.50, '2026-09-01', 1, 2, userId]
    );

    // 3. Consulta e validação
    const result = await db.raw('SELECT * FROM expense WHERE name = ?', ['Groceries']);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Groceries');
    // PostgreSQL retorna Numeric/Decimal como string no JS para evitar perda de precisão
    expect(parseFloat(result.rows[0].amount)).toBe(150.50);
  });
});

/**
 * Tabela expense
 *  id                   | bigint            |           | not null | nextval('expense_id_seq'::regclass)
 name                 | character varying |           | not null | 
 payment_date         | date              |           |          | 
 amount               | numeric(10,2)     |           |          | 
 payment_method_id    | integer           |           | not null | 
 payment_status       | integer           |           | not null | 
 description          | character varying |           |          | 
 is_recurrent         | boolean           |           | not null | false
 due_date             | date              |           |          | 
 statement_id         | integer           |           |          | 
 recurring_expense_id | integer           |           |          | 
 user_id              | integer           |           | not null | 
 */