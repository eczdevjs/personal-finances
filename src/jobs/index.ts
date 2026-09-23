import { setupProcessMonthlyExpensesJob } from "./processMontlyExpensesJob";

export function initJobs(){

    if(process.env.NODE_ENV === 'test'){
        return;
    }

    setupProcessMonthlyExpensesJob();
}