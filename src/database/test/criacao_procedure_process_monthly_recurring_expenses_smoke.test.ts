import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../connection';

describe('Database Migrations - Procedures', () => {
    beforeAll(async () => {
        await db.migrate.latest();
    });

    afterAll(async () => {
        await db.destroy();
    });

    it('Should have procedure process_montly_recurring_expenses created into data base', async () => {
        const result = await db.raw(`SELECT routine_name FROM information_schema.routines WHERE routine_type = 'PROCEDURE' AND routine_name =  'process_monthly_recurring_expenses';`);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].routine_name).toBe('process_monthly_recurring_expenses');
    });

})