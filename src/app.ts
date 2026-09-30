import express from 'express';
import { initJobs } from './jobs';
import { httpLogger } from './config/middlewares/httpLogger';
import { errorHandler } from './config/middlewares/errorHandler';
import { AppError } from './config/errors/AppError';
const app = express();
const port = 3000;

app.use(express.json());

// INICIALIZACAO DAS ROTINAS AGENDADAS NODE-CRON
initJobs();

app.use(httpLogger);

// teste httpLogger

app.get('/health', (req, res)=> {
    res.status(200).json({status: 'ok', correlationId: req.correlationId})
});

app.get('/', (req, res) => {
    res.send('Express Server running port 3000, listening...');
});

app.listen(port, () => {
    console.log('Example app listening port: ', port)
});


//TESTE ROTA DE ERRO

app.get('/example-error', () => {
    throw new AppError('Dados invalidos test erro', 400, {field: 'amount'})
});

app.get('/unhandled-error', () => {
    throw new Error('Falha grave inesperada no servidor')
});

app.use(errorHandler);