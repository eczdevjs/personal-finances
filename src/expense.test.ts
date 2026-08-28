import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import db from './database/connection';

describe('Expense database integration', () => {
  // 1. Ensure migrations run before tests start
  beforeAll(async () => {
    await db.migrate.latest();
  });

  // 2. Clean up test database connection after tests finish
  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    // 3. Clear existing table rows safely
    await db.raw('TRUNCATE TABLE expense RESTART IDENTITY CASCADE');
  });

  it('should insert a new expense and query it back using raw sql', async () => {
    // Insert prerequisite foreign key records first if needed
    await db.raw(`INSERT INTO payment_status (id, status) VALUES (1, 'PENDING') ON CONFLICT DO NOTHING`);
    await db.raw(`INSERT INTO payment_method (id, name) VALUES (1, 'CREDIT_CARD') ON CONFLICT DO NOTHING`);
    await db.raw(`INSERT INTO expense_type (id, type) VALUES (1, 'VARIABLE') ON CONFLICT DO NOTHING`);

    // Insert the test expense
    await db.raw(
      `INSERT INTO expense (name, amount, due_date, payment_method_id, payment_status, expense_type_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Groceries', 150.50, '2026-09-01', 1, 1, 1]
    );

    // Query back
    const result = await db.raw(
      'SELECT * FROM expense WHERE name = ?', 
      ['Groceries']
    );

    // Assertions
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Groceries');
    expect(parseFloat(result.rows[0].amount)).toBe(150.50);
  });
});