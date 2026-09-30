import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Criação das Tabelas e Foreign Keys
  await knex.schema.raw(`
    BEGIN;

    CREATE TABLE IF NOT EXISTS public.credit_card
    (
        id bigserial NOT NULL,
        issuing_bank character varying COLLATE pg_catalog."default" NOT NULL,
        card_network character varying COLLATE pg_catalog."default" NOT NULL,
        last_four_digits integer NOT NULL,
        credit_limit numeric(10, 2) NOT NULL,
        user_id integer NOT NULL,
        CONSTRAINT credit_card_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS public.credit_card_purchase
    (
        id bigserial NOT NULL,
        amount numeric(10, 2) NOT NULL,
        instalment_number integer NOT NULL,
        instalment_amount numeric(10, 2) NOT NULL,
        statement_id bigint NOT NULL,
        purchase_date date NOT NULL,
        name character varying(255) COLLATE pg_catalog."default" NOT NULL,
        description character varying(255) COLLATE pg_catalog."default",
        category_id integer,
        current_instalment integer,
        CONSTRAINT credit_card_purchase_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS public.credit_card_purchase_item
    (
        id bigserial NOT NULL,
        purchase_id integer,
        statement_id integer,
        instalment_number smallint,
        amount numeric(10, 2),
        CONSTRAINT credit_card_purchase_item_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS public.credit_card_statement
    (
        id bigserial NOT NULL,
        amount numeric(10, 2) NOT NULL DEFAULT 0.00,
        payment_status_id integer NOT NULL DEFAULT 1,
        due_date date NOT NULL,
        credit_card_id bigint NOT NULL,
        statement_start date NOT NULL,
        statement_closing date NOT NULL,
        CONSTRAINT credit_card_statement_pkey PRIMARY KEY (id),
        CONSTRAINT credit_card_statement_unique_closing UNIQUE (credit_card_id, statement_closing)
    );

    CREATE TABLE IF NOT EXISTS public.crossed_category_expense
    (
        expense_id integer NOT NULL,
        category_id integer NOT NULL,
        CONSTRAINT crossed_category_expense_pk PRIMARY KEY (expense_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS public.debit_card
    (
        id bigserial NOT NULL,
        issuing_bank character varying COLLATE pg_catalog."default" NOT NULL,
        last_four_digit integer NOT NULL,
        card_network character varying COLLATE pg_catalog."default" NOT NULL,
        CONSTRAINT debit_card_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS public.expense
    (
        id bigserial NOT NULL,
        name character varying COLLATE pg_catalog."default" NOT NULL,
        payment_date date,
        amount numeric(10, 2),
        payment_method_id integer NOT NULL,
        payment_status integer NOT NULL,
        description character varying COLLATE pg_catalog."default",
        is_recurrent boolean NOT NULL DEFAULT false,
        due_date date,
        statement_id integer,
        recurring_expense_id integer,
        user_id integer NOT NULL,
        CONSTRAINT expense_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS public.expense_category
    (
        id bigserial NOT NULL,
        name character varying COLLATE pg_catalog."default" NOT NULL,
        CONSTRAINT expense_category_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS public.payment_method
    (
        id bigserial NOT NULL,
        name character varying COLLATE pg_catalog."default" NOT NULL,
        CONSTRAINT payment_method_pkey PRIMARY KEY (id),
        CONSTRAINT payment_method_unique_name UNIQUE (name)
    );

    CREATE TABLE IF NOT EXISTS public.payment_status
    (
        id bigserial NOT NULL,
        status character varying COLLATE pg_catalog."default" NOT NULL,
        CONSTRAINT payment_status_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS public.recurring_expense
    (
        id bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 ),
        name character varying COLLATE pg_catalog."default" NOT NULL,
        amount numeric(10, 2) NOT NULL,
        payment_method_id integer,
        expense_type_id integer,
        start_date date NOT NULL,
        end_date date,
        frequency_day integer NOT NULL,
        active boolean NOT NULL DEFAULT true,
        user_id integer NOT NULL,
        description character varying(255) COLLATE pg_catalog."default",
        CONSTRAINT recurring_expense_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS public.users
    (
        id bigserial NOT NULL,
        name character varying(255) COLLATE pg_catalog."default" NOT NULL,
        email character varying(255) NOT NULL,
        pass_hash character varying,
        CONSTRAINT users_pkey PRIMARY KEY (id),
        CONSTRAINT unique_email UNIQUE (email)
    );

    CREATE TABLE IF NOT EXISTS public.crossed_credit_card_purchase_category
    (
        category_id integer NOT NULL,
        credit_card_purchase_id integer NOT NULL,
        CONSTRAINT crossed_category_purchase_pk PRIMARY KEY (category_id, credit_card_purchase_id)
    );

    -- Foreign Keys
    ALTER TABLE IF EXISTS public.credit_card
        ADD CONSTRAINT credit_card_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id);

    ALTER TABLE IF EXISTS public.credit_card_purchase
        ADD CONSTRAINT category_id_fk FOREIGN KEY (category_id) REFERENCES public.expense_category (id),
        ADD CONSTRAINT statment_id_fk FOREIGN KEY (statement_id) REFERENCES public.credit_card_statement (id);

    ALTER TABLE IF EXISTS public.credit_card_purchase_item
        ADD CONSTRAINT credit_card_purchase_item_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.credit_card_purchase (id),
        ADD CONSTRAINT credit_card_purchase_item_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.credit_card_statement (id);

    ALTER TABLE IF EXISTS public.credit_card_statement
        ADD CONSTRAINT credit_card_foreign_key FOREIGN KEY (credit_card_id) REFERENCES public.credit_card (id);

    ALTER TABLE IF EXISTS public.crossed_category_expense
        ADD CONSTRAINT categorie_id_fk FOREIGN KEY (category_id) REFERENCES public.expense_category (id),
        ADD CONSTRAINT expense_id_fk FOREIGN KEY (expense_id) REFERENCES public.expense (id);

    ALTER TABLE IF EXISTS public.expense
        ADD CONSTRAINT expense_recurring_expense_id_fkey FOREIGN KEY (recurring_expense_id) REFERENCES public.recurring_expense (id),
        ADD CONSTRAINT expense_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id),
        ADD CONSTRAINT payment_method_fk FOREIGN KEY (payment_method_id) REFERENCES public.payment_method (id),
        ADD CONSTRAINT payment_status_fk FOREIGN KEY (payment_status) REFERENCES public.payment_status (id),
        ADD CONSTRAINT statement_id_fk FOREIGN KEY (statement_id) REFERENCES public.credit_card_statement (id);

    ALTER TABLE IF EXISTS public.recurring_expense
        ADD CONSTRAINT recurring_expense_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_method (id),
        ADD CONSTRAINT recurring_expense_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id);

    ALTER TABLE IF EXISTS public.crossed_credit_card_purchase_category
        ADD CONSTRAINT credit_card_purchase_id_fk FOREIGN KEY (credit_card_purchase_id) REFERENCES public.credit_card_purchase (id),
        ADD CONSTRAINT catgegory_id_fk FOREIGN KEY (category_id) REFERENCES public.expense_category (id);

    COMMIT;
  `);

  // 2. Criar Função: get_or_create_statement
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION public.get_or_create_statement(
        p_credit_card_id bigint,
        p_target_date date,
        p_closing_day integer DEFAULT 30,
        p_due_day integer DEFAULT 7
    )
    RETURNS bigint
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    AS $BODY$
    DECLARE
        v_statement_id BIGINT;
        v_closing_date DATE;
        v_start_date DATE;
        v_due_date DATE;
        v_target_month_start DATE;
    BEGIN
        IF EXTRACT(DAY FROM p_target_date) > p_closing_day THEN
            v_target_month_start := (date_trunc('month', p_target_date) + INTERVAL '1 month')::DATE;
        ELSE
            v_target_month_start := date_trunc('month', p_target_date)::DATE;
        END IF;

        v_closing_date := LEAST(
            v_target_month_start + ((p_closing_day - 1) || ' days')::interval,
            (v_target_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
        );

        SELECT id INTO v_statement_id
        FROM credit_card_statement
        WHERE credit_card_id = p_credit_card_id
          AND statement_closing = v_closing_date;

        IF v_statement_id IS NULL THEN
            v_start_date := (v_closing_date - INTERVAL '1 month' + INTERVAL '1 day')::DATE;
            v_due_date := (date_trunc('month', v_closing_date) + INTERVAL '1 month' + ((p_due_day - 1) || ' days')::interval)::DATE;

            INSERT INTO credit_card_statement (
                credit_card_id, statement_start, statement_closing, due_date, payment_status_id, amount
            ) VALUES (
                p_credit_card_id, v_start_date, v_closing_date, v_due_date, 1, 0.00
            )
            ON CONFLICT (credit_card_id, statement_closing) 
            DO UPDATE SET credit_card_id = EXCLUDED.credit_card_id
            RETURNING id INTO v_statement_id;
        END IF;

        RETURN v_statement_id;
    END;
    $BODY$;
  `);

  // 3. Criar Função: insert_credit_card_purchase
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION public.insert_credit_card_purchase(
        p_credit_card_id bigint,
        p_name character varying,
        p_total_amount numeric,
        p_total_instalments integer,
        p_instalment_amount numeric,
        p_purchase_date date,
        p_description character varying DEFAULT NULL::character varying,
        p_category_id integer DEFAULT NULL::integer
    )
    RETURNS bigint
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    AS $BODY$
    DECLARE
        v_purchase_id BIGINT;
        v_target_date DATE;
        v_statement_id BIGINT;
        v_initial_statement_id BIGINT;
        i INT;
    BEGIN
        v_initial_statement_id := get_or_create_statement(p_credit_card_id, p_purchase_date);

        INSERT INTO credit_card_purchase (
            name, amount, instalment_number, instalment_amount, 
            purchase_date, description, category_id, statement_id
        ) VALUES (
            p_name, p_total_amount, p_total_instalments, p_instalment_amount, 
            p_purchase_date, p_description, p_category_id, v_initial_statement_id
        )
        RETURNING id INTO v_purchase_id;

        FOR i IN 1..p_total_instalments LOOP
            v_target_date := (p_purchase_date + ((i - 1) || ' month')::interval)::DATE;
            v_statement_id := get_or_create_statement(p_credit_card_id, v_target_date);

            INSERT INTO credit_card_purchase_item (
                purchase_id, statement_id, instalment_number, amount
            ) VALUES (
                v_purchase_id, v_statement_id, i, p_instalment_amount
            );
        END LOOP;

        RETURN v_purchase_id;
    END;
    $BODY$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    DROP FUNCTION IF EXISTS public.insert_credit_card_purchase(bigint, character varying, numeric, integer, numeric, date, character varying, integer);
    DROP FUNCTION IF EXISTS public.get_or_create_statement(bigint, date, integer, integer);

    DROP TABLE IF EXISTS public.crossed_credit_card_purchase_category CASCADE;
    DROP TABLE IF EXISTS public.crossed_category_expense CASCADE;
    DROP TABLE IF EXISTS public.credit_card_purchase_item CASCADE;
    DROP TABLE IF EXISTS public.credit_card_purchase CASCADE;
    DROP TABLE IF EXISTS public.expense CASCADE;
    DROP TABLE IF EXISTS public.recurring_expense CASCADE;
    DROP TABLE IF EXISTS public.credit_card_statement CASCADE;
    DROP TABLE IF EXISTS public.credit_card CASCADE;
    DROP TABLE IF EXISTS public.debit_card CASCADE;
    DROP TABLE IF EXISTS public.expense_category CASCADE;
    DROP TABLE IF EXISTS public.payment_method CASCADE;
    DROP TABLE IF EXISTS public.payment_status CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;
  `);
}