import { Knex } from "knex";
import logger from "../../../infrastructure/config/logger";

export class ProcessMonthlyRecurringExpensesUseCase {
    constructor(private readonly db: Knex) { }

    async execute(targetDate: string): Promise<number> {
        const context = 'ProcessMonthlyRecurringExpensesUseCase';

        logger.info('Starting execution of recurring expenses use case', {
            context,
            targetDate
        });

        const startTime = Date.now();

        try {
            const result = await this.db.raw(
                'CALL process_monthly_recurring_expenses(?,?)',
                [targetDate, null]
            );

            const durationMs = Date.now() - startTime;
            const insertedCount = result.rows?.[0]?.p_inserted_count ?? 0;

            logger.info('Recurring expense use case finished',{
                context,
                targetDate,
                insertedCount,
                durationMs
            });

            return insertedCount;
        }catch(error){
            logger.error('Error executing recurring expense use case',{
                context,
                targetDate,
                durationMs: Date.now() - startTime,
                error
            });
            throw error;
        }
    }
}