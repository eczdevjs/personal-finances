import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { httpLogger } from '../httpLogger';
import logger from '../../logger';


describe('Http logger middleware', () => {
    it('Should intect and return correlation id into header X-Correlation-ID', async () => {
        const app = express();
        app.use(httpLogger);
        app.get('/test', (req, res) => {
            res.status(200).send('OK');
        });

        const response = await request(app).get('/test');

        expect(response.headers['x-correlation-id']).toBeDefined();
        expect(response.status).toBe(200);
    });

    it('Should reuse X-Correlation-ID sent from requisition', async () => {
        const app = express();
        app.use(httpLogger);
        app.get('/test', (req, res) => {
            res.status(200).send('OK');
        });

        const customId = 'my-custom-correlation-id-123';
        const response = await request(app).get('/test').set('X-Correlation-ID', customId);

        expect(response.headers['x-correlation-id']).toBe(customId);
    });
});