import { describe, it, expect, afterEach, vi } from 'vitest';
import db from '../../../../infrastructure/database/connection'; // 👈 Importa a conexão que já usa o ambiente de teste (.env.test)
import { ProcessMonthlyRecurringExpensesUseCase } from '../ProcessMontlyRecurringExpensesUseCase';
import logger from '../../../../infrastructure/config/logger';


describe('ProcessMonthlyRecurringExpenseUseCase (Integration Test)', () => {
    const useCase = new ProcessMonthlyRecurringExpensesUseCase(db);

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Should execute procedure and register logs both start and success', async () => {
        const loggedMessages: Array<{ level: string, message: string, context?: string }> = [];

        const handleLog = (info: any) => {
            loggedMessages.push(info);
        }

        logger.on('data', handleLog);

        vi.spyOn(db, 'raw').mockResolvedValueOnce({
            rows: [{ p_inserted_count: 3 }]
        } as any);

        const targetDate = '2026-10-01';
        const insertedCount = await useCase.execute(targetDate);

        logger.off('data', handleLog);

        expect(insertedCount).toBe(3);

        const startLog = loggedMessages.find((l) => l.message.includes('Starting'));

        const endLog = loggedMessages.find((l) => l.message.includes('finished'));


        expect (startLog).toBeDefined();
        expect (endLog?.context).toBe('ProcessMonthlyRecurringExpensesUseCase');

        expect(endLog).toBeDefined();
        expect(endLog?.context).toBe('ProcessMonthlyRecurringExpensesUseCase');

    })

    it('Should retain and register error in case procedure fail',async () =>{
        const loggedMessage : any[] = [];
        const handleLog = (info: any) => loggedMessage.push(info);

        logger.on('data', handleLog);

        const databaseError = new Error('Database execution failed');
        vi.spyOn(db, 'raw').mockRejectedValueOnce(databaseError);

        const targetDate = '2026-10-01';

        await expect (useCase.execute(targetDate)).rejects.toThrow('Database execution failed');

        logger.off('data', handleLog);

        const errorLog = loggedMessage.find((l) => l.message.includes('Error executing'))

        expect(errorLog).toBeDefined();
        expect(errorLog?.error).toBeDefined();

    })

});
