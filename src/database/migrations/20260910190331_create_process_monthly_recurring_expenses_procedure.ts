import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.raw(`
    CREATE OR REPLACE PROCEDURE public.process_monthly_recurring_expenses(
      IN p_target_date date DEFAULT CURRENT_DATE
    )
    LANGUAGE 'plpgsql'
    AS $BODY$
    DECLARE
        v_year INT := EXTRACT(YEAR FROM p_target_date);
        v_month INT := EXTRACT(MONTH FROM p_target_date);
        v_inserted_count INT := 0;
    BEGIN
        INSERT INTO expense (
            user_id,
            name,
            amount,
            category_id,
            payment_method_id,
            payment_status,
            due_date,
            is_recurrent,
            recurring_expense_id,
            description
        )
        SELECT 
            re.user_id,
            re.name,
            re.amount,
            re.category_id,
            re.payment_method_id,
            1, -- ID do payment_status inicial ('Pendente')
            MAKE_DATE(v_year, v_month, LEAST(re.frequency_day, 28)), 
            true,
            re.id,
            re.description
        FROM recurring_expense re
        WHERE re.active = true
          AND re.start_date <= p_target_date
          AND (re.end_date IS NULL OR re.end_date >= DATE_TRUNC('month', p_target_date)::DATE)
          AND NOT EXISTS (
              SELECT 1 
              FROM expense e 
              WHERE e.recurring_expense_id = re.id
                AND EXTRACT(YEAR FROM e.due_date) = v_year
                AND EXTRACT(MONTH FROM e.due_date) = v_month
          );

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
        RAISE NOTICE 'Despesas recorrentes processadas com sucesso. Total inserido: %', v_inserted_count;
    END;
    $BODY$;

    ALTER PROCEDURE public.process_monthly_recurring_expenses(date)
        OWNER TO postgres;
  `);
}

export async function down(knex: Knex): Promise<void> {
  return knex.raw(`
    DROP PROCEDURE IF EXISTS public.process_monthly_recurring_expenses(date);
  `);
}

// comando para criar migration: npm run migrate:make -- prcess_monthy_recurring_expense