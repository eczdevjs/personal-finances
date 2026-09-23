# 5. Adopção de Rastreabilidade HTTP e Logs Estruturados com Correlation ID

* **Status:** Aceito
* **Data:** 23-09-2026
* **Autores:** ecz

## Contexto e Problema
Com o crescimento da API e a execução de procedimentos assíncronos e operações em banco de dados (como Stored Procedures e Cron Jobs), identificar a causa raiz de falhas em chamadas HTTP específicas tornou-se um desafio. Sem um identificador único entre a requisição HTTP e os logs de infraestrutura/banco, fica difícil correlacionar entradas do usuário com erros internos.

## Decisão Tomada
Decidimos implementar um middleware transversal de auditoria HTTP (`httpLogger`) utilizando **Winston** e **Correlation ID** (`X-Correlation-ID`), seguindo as regras:

1. **Geração e Propagação de ID:**
   * Caso o cliente envie o cabeçalho `X-Correlation-ID`, este será reutilizado.
   * Caso contrário, o middleware gerará um novo `UUIDv4`.
   * O ID é injetado no objeto de requisição do Express (`req.correlationId`) e devolvido no cabeçalho de resposta HTTP (`X-Correlation-ID`).

2. **Auditoria de Entrada e Saída:**
   * Todas as requisições geram um log de entrada (`--> METHOD URL`).
   * No encerramento da requisição (`res.on('finish')`), calcula-se a duração em milissegundos (`durationMs`) e registra-se o status code com o respectivo nível de log (`info` para 2xx/3xx, `warn` para 4xx, `error` para 5xx).

3. **Injeção de Contexto:**
   * O `correlationId` deve ser repassado para Use Cases, Services e middlewares de erro.

## Consequências

### Positivas
* **Rastreabilidade Total:** Capacidade de filtrar todos os logs (entrada, banco de dados, exceções e saída) associados a uma única requisição.
* **Métricas de Performance:** Medição precisa do tempo de resposta (`durationMs`) de cada endpoint diretamente nos logs.
* **Padronização:** Uniformidade nos dados emitidos no `stdout`.

### Negativas / Riscos
* **Pequeno Overhead:** Ligeiro tempo computacional extra para calcular `durationMs` e instanciar UUIDs a cada requisição HTTP (desprezível na maioria dos cenários).