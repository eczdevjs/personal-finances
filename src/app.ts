import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Express Server running port 3000, listening...');
});

app.listen(port, () => {
    console.log('Example app listening port: ', port)
});