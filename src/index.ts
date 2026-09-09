import 'dotenv/config';
import db from './database/connection';

async function testDatabaseConnection() {
    try {
        console.log(`Connecting into dababase ${process.env.DB_NAME} at ${process.env.DB_HOST}:${process.env.DB_PORT}
        `);

        const result = await db.raw('SELECT NOW() AS current_time, current_database() as db_name');

        console.log('✅ Connection successful!');
        console.log('Database time: ', result.rows[0].current_time);
        console.log('Connected DB: ', result.rows[0].db_name);



    } catch (error) {
        console.error('❌ Failed to connect to the database:');
        console.error(error);
    } finally {
        await db.destroy();
    }
}

testDatabaseConnection();

import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Express Server running port 3000, listeningc...');
});

app.listen(port, () => {
    console.log('Example app listening port: ', port)
});