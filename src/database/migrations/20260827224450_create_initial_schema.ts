import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    BEGIN;

    -- ============================================================================
    -- 1. FUNCTIONS
    -- ============================================================================

    CREATE OR REPLACE FUNCTION public.get_or_create_statement(
      p_credit_card_id bigint, 
      p_target_date date, 
      p_closing_day integer DEFAULT 30, 
      p_due_day integer DEFAULT 7
    ) RETURNS bigint
    LANGUAGE plpgsql
    AS $_$
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
    $_$;

    CREATE OR REPLACE FUNCTION public.insert_credit_card_purchase(
      p_credit_card_id bigint, 
      p_name character varying, 
      p_total_amount numeric, 
      p_total_instalments integer, 
      p_instalment_amount numeric, 
      p_purchase_date date, 
      p_description character varying DEFAULT NULL::character varying, 
      p_category_id integer DEFAULT NULL::integer
    ) RETURNS bigint
    LANGUAGE plpgsql
    AS $_$
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
    $_$;

    -- ============================================================================
    -- 2. SEQUENCES & TABLES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS public.credit_card (
        id bigserial NOT NULL PRIMARY KEY,
        issuing_bank character varying NOT NULL,
        card_network character varying NOT NULL,
        last_four_digits integer NOT NULL,
        credit_limit numeric(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.payment_status (
        id bigserial NOT NULL PRIMARY KEY,
        status character varying NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.payment_method (
        id bigserial NOT NULL PRIMARY KEY,
        name character varying NOT NULL CONSTRAINT payment_method_unique_name UNIQUE
    );

    CREATE TABLE IF NOT EXISTS public.expense_category (
        id bigserial NOT NULL PRIMARY KEY,
        name character varying NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.expense_type (
        id bigserial NOT NULL PRIMARY KEY,
        type character varying(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.credit_card_statement (
        id bigserial NOT NULL PRIMARY KEY,
        amount numeric(10,2) DEFAULT 0.00 NOT NULL,
        payment_status_id integer DEFAULT 1 NOT NULL,
        due_date date NOT NULL,
        credit_card_id bigint NOT NULL,
        statement_start date NOT NULL,
        statement_closing date NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.credit_card_purchase (
        id bigserial NOT NULL PRIMARY KEY,
        amount numeric(10,2) NOT NULL,
        instalment_number integer NOT NULL,
        instalment_amount numeric(10,2) NOT NULL,
        statement_id bigint NOT NULL,
        purchase_date date NOT NULL,
        name character varying(255) NOT NULL,
        description character varying(255),
        category_id integer,
        current_instalment integer
    );

    CREATE TABLE IF NOT EXISTS public.credit_card_purchase_item (
        id bigserial NOT NULL PRIMARY KEY,
        purchase_id integer,
        statement_id integer,
        instalment_number smallint,
        amount numeric(10,2)
    );

    CREATE TABLE IF NOT EXISTS public.crossed_categorie_expense (
        id bigserial NOT NULL PRIMARY KEY,
        expense_id integer NOT NULL,
        category_id integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.debit_card (
        id bigserial NOT NULL PRIMARY KEY,
        issuing_bank character varying NOT NULL,
        last_four_digit integer NOT NULL,
        card_network character varying NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.expense (
        id bigserial NOT NULL PRIMARY KEY,
        category_id bigint,
        name character varying NOT NULL,
        payment_date date,
        amount numeric(10,2),
        payment_method_id integer NOT NULL,
        payment_status integer NOT NULL,
        description character varying,
        "isRecurrent" boolean DEFAULT false NOT NULL,
        due_date date,
        statement_id integer,
        expense_type_id integer NOT NULL
    );

    -- ============================================================================
    -- 3. VIEWS
    -- ============================================================================

    CREATE OR REPLACE VIEW public.full_fields_expense AS
    SELECT expense.id,
        expense.name,
        expense.payment_date,
        expense.amount,
        expense.description,
        expense_category.name AS category,
        payment_method.name AS payment_method,
        payment_status.status,
        expense.due_date
    FROM (((public.expense
      JOIN public.expense_category ON ((expense.category_id = expense_category.id)))
      JOIN public.payment_method ON ((expense.payment_method_id = payment_method.id)))
      JOIN public.payment_status ON ((expense.payment_status = payment_status.id)));

    CREATE OR REPLACE VIEW public.vw_all_expenses AS
    SELECT e.id AS expense_id,
        e.description,
        e.expense_type_id,
        CASE
            WHEN (e.expense_type_id = 2) THEN COALESCE(sum(i.amount), 0.0)
            ELSE e.amount
        END AS total_amount
    FROM (public.expense e
      LEFT JOIN public.credit_card_purchase i ON ((e.statement_id = i.statement_id)))
    GROUP BY e.id, e.description, e.expense_type_id, e.amount;

    -- ============================================================================
    -- 4. INDICES
    -- ============================================================================

    CREATE UNIQUE INDEX IF NOT EXISTS idx_card_statement_closing ON public.credit_card_statement USING btree (credit_card_id, statement_closing);
    CREATE INDEX IF NOT EXISTS idx_epense_due_date ON public.expense USING btree (due_date);

    -- ============================================================================
    -- 5. FOREIGN KEY CONSTRAINTS (DO NOTHING IF ALREADY EXISTS)
    -- ============================================================================

    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categorie_id_fk') THEN
        ALTER TABLE ONLY public.crossed_categorie_expense ADD CONSTRAINT categorie_id_fk FOREIGN KEY (category_id) REFERENCES public.expense_category(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_id_fk') THEN
        ALTER TABLE ONLY public.credit_card_purchase ADD CONSTRAINT category_id_fk FOREIGN KEY (category_id) REFERENCES public.expense_category(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_card_foreign_key') THEN
        ALTER TABLE ONLY public.credit_card_statement ADD CONSTRAINT credit_card_foreign_key FOREIGN KEY (credit_card_id) REFERENCES public.credit_card(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_card_purchase_item_purchase_id_fkey') THEN
        ALTER TABLE ONLY public.credit_card_purchase_item ADD CONSTRAINT credit_card_purchase_item_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.credit_card_purchase(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_card_purchase_item_statement_id_fkey') THEN
        ALTER TABLE ONLY public.credit_card_purchase_item ADD CONSTRAINT credit_card_purchase_item_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.credit_card_statement(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expense_id_fk') THEN
        ALTER TABLE ONLY public.crossed_categorie_expense ADD CONSTRAINT expense_id_fk FOREIGN KEY (expense_id) REFERENCES public.expense(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expense_type_id_fk') THEN
        ALTER TABLE ONLY public.expense ADD CONSTRAINT expense_type_id_fk FOREIGN KEY (expense_type_id) REFERENCES public.expense_type(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_method_fk') THEN
        ALTER TABLE ONLY public.expense ADD CONSTRAINT payment_method_fk FOREIGN KEY (payment_method_id) REFERENCES public.payment_method(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_status_fk') THEN
        ALTER TABLE ONLY public.expense ADD CONSTRAINT payment_status_fk FOREIGN KEY (payment_status) REFERENCES public.payment_status(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'statement_id_fk') THEN
        ALTER TABLE ONLY public.expense ADD CONSTRAINT statement_id_fk FOREIGN KEY (statement_id) REFERENCES public.credit_card_statement(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'statment_id_fk') THEN
        ALTER TABLE ONLY public.credit_card_purchase ADD CONSTRAINT statment_id_fk FOREIGN KEY (statement_id) REFERENCES public.credit_card_statement(id);
      END IF;
    END $$;

    COMMIT;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    BEGIN;
    DROP VIEW IF EXISTS public.vw_all_expenses CASCADE;
    DROP VIEW IF EXISTS public.full_fields_expense CASCADE;
    
    DROP TABLE IF EXISTS public.crossed_categorie_expense CASCADE;
    DROP TABLE IF EXISTS public.credit_card_purchase_item CASCADE;
    DROP TABLE IF EXISTS public.credit_card_purchase CASCADE;
    DROP TABLE IF EXISTS public.expense CASCADE;
    DROP TABLE IF EXISTS public.credit_card_statement CASCADE;
    DROP TABLE IF EXISTS public.debit_card CASCADE;
    DROP TABLE IF EXISTS public.credit_card CASCADE;
    DROP TABLE IF EXISTS public.expense_type CASCADE;
    DROP TABLE IF EXISTS public.expense_category CASCADE;
    DROP TABLE IF EXISTS public.payment_method CASCADE;
    DROP TABLE IF EXISTS public.payment_status CASCADE;

    DROP FUNCTION IF EXISTS public.insert_credit_card_purchase CASCADE;
    DROP FUNCTION IF EXISTS public.get_or_create_statement CASCADE;
    COMMIT;
  `);
}