# ADR 004: Política de Logging Estruturado com Winston

- **Status:** Aceito
- **Data:** 2026-09-10
- **Módulo:** Transversal / Observabilidade & Infraestrutura
- **Autores:** Erico (`eczdevjs`)

---

## 1. Contexto e Problema

Com o crescimento da aplicação e a adição de rotinas assíncronas (como cron jobs e execuções de Stored Procedures), o uso desordenado de `console.log()` traz os seguintes problemas:

- **Falta de Estrutura:** impossibilidade de filtrar logs por nível de severidade ou por contexto de módulo no ambiente de produção.

- **Ausência de Rastreabilidade:** dificuldade para associar múltiplos logs a uma mesma requisição de usuário (Correlation ID).

- **Riscos de Segurança:** exposição acidental de dados sensíveis (senhas, tokens, dados PII/LGPD) nos logs do servidor.

---

## 2. Decisão de Arquitetura

Adotamos a biblioteca **Winston** para centralizar todos os logs do sistema.

A emissão de logs deve ser estruturada em formato JSON em produção e formatada para leitura em desenvolvimento.

### 2.1. Níveis de Severidade Padronizados

Seguiremos os níveis nativos do Winston:

- **`error` (0):** falhas críticas, exceções não tratadas e erros de banco de dados.

- **`warn` (1):** situações anômalas que não quebraram a aplicação (ex.: falha de autenticação repetida, retentativas de conexão).

- **`info` (2):** eventos relevantes de negócio e ciclo de vida (ex.: início/fim de jobs, usuário cadastrado, despesas geradas).

- **`debug` (3):** informações detalhadas de suporte para desenvolvimento (ex.: tempo de execução de queries específicas, payloads de chamadas internas).

---

## 3. Padrão do Schema de Log

Todo log gerado pela aplicação deve ser um objeto JSON contendo o seguinte contrato mínimo:

```json
{
  "timestamp": "2026-09-10T17:30:00.000Z",
  "level": "info",
  "message": "Processamento de despesas recorrentes concluído com sucesso",
  "context": "RecurringExpensesJob",
  "correlationId": "a8f3c4e1-2b9d-4e5f-8c3a-1b2c3d4e5f6a",
  "metadata": {
    "targetDate": "2026-09-01",
    "rowsProcessed": 15
  }
}
```

---

## 4. Regras de Sanitização e Privacidade (LGPD)

É estritamente proibido logar:

- Senhas em texto plano ou hashes de autenticação.
- Tokens JWT ou chaves de API.
- Dados de cartão de crédito/débito completos.

A configuração do Winston conterá um *format pipeline* customizado para omitir ou mascarar chaves sensíveis (`password`, `token`, `credit_card`) automaticamente em qualquer metadado recebido.

---

## 5. Estrutura e Transporte (Transports)

### 5.1. Desenvolvimento (`development`)

Saída via console formatada com cores (*cli*) e legível para humanos.

### 5.2. Produção / Testes (`production` / `test`)

Saída via `stdout` em formato JSON estrito para captura por coletores de log (ex.: Datadog, Grafana Loki, CloudWatch).

---

## 6. Consequências

### 6.1. Positivas

- **Observabilidade:** capacidade de buscar e auditar eventos específicos em produção usando ferramentas de monitoramento.

- **Padronização:** interface única importada em controllers, services, repositories e jobs.

### 6.2. Negativas / Mitigações

- **Overhead de CPU/I/O em logs excessivos:**

  **Mitigação:** configurar o nível padrão em produção como `info`, desativando o nível `debug` em ambientes produtivos.
