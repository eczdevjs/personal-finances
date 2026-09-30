import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import cron from 'node-cron';
import { setupProcessMonthlyExpensesJob } from '../processMontlyExpensesJob';
import { ProcessMonthlyRecurringExpensesUseCase } from '../../../application/use-cases/process-monthly-recurring-expenses/ProcessMontlyRecurringExpensesUseCase';
import logger from '../../config/logger';


vi.mock('../../../modules/recurring-expenses/use-cases/ProcessMonthlyExpensesUseCase');

describe('processMonthlyExpensesJob', () => {
    beforeEach(()=> {
        vi.clearAllMocks();
    });

    it('should schedule with right expression for 1st',()=> {
        const cronSpy = vi.spyOn(cron, 'schedule').mockImplementation((_expression,callback ) => {
            return {} as any;
        });

        setupProcessMonthlyExpensesJob();

        expect(cronSpy).toHaveBeenCalledWith('0 0 1 * *', expect.any(Function));
    } );

    it('should execute use case when cron is triggered', async () =>{
        let cronCallback : ()=> void | Promise<void> = () => {};

        vi.spyOn(cron, 'schedule').mockImplementation((_expresssion, callback)=> {
            cronCallback = callback as () => void | Promise<void>;
            return {} as any;
        });

        const executeSpy = vi.spyOn(ProcessMonthlyRecurringExpensesUseCase.prototype, 'execute').mockResolvedValue(5);

        // const executeMock = vi.fn().mockResolvedValue(5);
        // vi.mocked(ProcessMonthlyRecurringExpensesUseCase).prototype.execute = executeMock;

        setupProcessMonthlyExpensesJob();

        await cronCallback();

        expect(executeSpy).toHaveBeenCalledTimes(1);
    });

});
