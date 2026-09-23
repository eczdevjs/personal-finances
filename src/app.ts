import express from 'express';
import { initJobs } from './jobs';

const app = express();
const port = 3000;

app.use(express.json());

// INICIALIZACAO DAS ROTINAS AGENDADAS NODE-CRON
initJobs();

app.get('/', (req, res) => {
    res.send('Express Server running port 3000, listening...');
});

app.listen(port, () => {
    console.log('Example app listening port: ', port)
});