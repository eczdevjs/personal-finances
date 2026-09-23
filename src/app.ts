import express from 'express';
import { initJobs } from './jobs';
import { httpLogger } from './config/middlewares/httpLogger';
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