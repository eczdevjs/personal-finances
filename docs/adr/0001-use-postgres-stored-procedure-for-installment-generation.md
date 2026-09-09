# ADR 001: Use PostgreSQL Stored Procedures for Installment Generation

* **Status:** Accepted
* **Date:** 2026-08-28
* **Deciders:** Engineering Team

## Context and Problem Statement
When a user records a multi-installment credit card purchase, the application must compute statement closing dates and generate individual installment payment items across future billing cycles. We needed to decide whether to execute this multi-step logic inside the Node.js application layer using Knex/ORM queries or push it to PostgreSQL via PL/pgSQL stored procedures.

## Decision Drivers
* **Data Consistency:** Calculating future billing cycles must execute atomically in a single database transaction.
* **Performance:** Processing 12–24 installment record inserts over a network bridge introduces multiple round-trips if executed sequentially in the app layer.
* **Domain Integrity:** Billing logic rules (closing dates, due dates, overflow handling) stay bound to the database schema.

## Considered Options
1. **Application-level ORM/Knex loops:** Node.js calculates dates and inserts parent/child records sequentially.
2. **PostgreSQL PL/pgSQL Stored Functions:** Execute `insert_credit_card_purchase` and `get_or_create_statement` directly in PostgreSQL.

## Decision Outcome
Chosen Option: **PostgreSQL PL/pgSQL Stored Functions** (`insert_credit_card_purchase`).

### Positive Consequences
* **Atomic Execution:** Entire purchase and installment item creation completes in a single database call, avoiding partial writes.
* **Reduced Network Overhead:** Eliminates 12+ individual `INSERT` queries over TCP; Node.js passes parameters once.
* **Encapsulated Business Logic:** Statement closing day and due date offsets are enforced deterministically regardless of which API endpoint initiates the transaction.

### Negative Consequences / Trade-offs
* Business logic lives in SQL files rather than pure TypeScript code.
* Testing requires running integration tests against a live PostgreSQL instance (resolved using Vitest + Knex migrations).

## Pros and Cons of Options

### Application-level ORM/Knex Loops
* Good, because code is written entirely in TypeScript and easier to mock in unit tests.
* Bad, because it requires multiple database round-trips per installment and risks partial failure if network hiccups occur mid-loop.

### PostgreSQL PL/pgSQL Stored Functions
* Good, because PostgreSQL handles internal loops (`FOR i IN 1..p_total_instalments LOOP`) natively within an isolated transaction.
* Bad, because schema migrations must manage PL/pgSQL function versions alongside table DDLs.