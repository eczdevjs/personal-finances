import cron from 'node-cron';
import db from '../database/connection';
import logger from '../config/logger';
import { ProcessMonthlyRecurringExpensesUseCase } from '../modules/recurring-expenses/use-cases/ProcessMontlyRecurringExpensesUseCase';

const CRON_SCHEDULE_FIRST_DAY_OF_MONTH = '0 0 1 * *';

export async function setupProcessMonthlyExpensesJob() {
    const useCase = new ProcessMonthlyRecurringExpensesUseCase(db);

    cron.schedule(CRON_SCHEDULE_FIRST_DAY_OF_MONTH, async () => {
        const context = 'ProcessMonthlyExpenseJob';
        const today = new Date().toString().split('T')[0];

        logger.info('Cron job triggered for processing recurring expenses', {
            context,
            executionDate: today
        });

        try {
            const insertedCount = await useCase.execute(today);

            logger.info('Cron job finished successfuly', {
                context,
                executionDate: today,
                insertedCount
            })
        } catch (error) {
            logger.info('Error executing Cron Job recurring expenses', {
                context,
                executionDate: today,
                error
            });
        }
    });

    logger.info('Job "proccessMonthlyExpenses" task was scheduled successfully (1st day at 00:00)');
}