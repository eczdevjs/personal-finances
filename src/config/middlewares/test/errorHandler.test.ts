import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { httpLogger } from '../httpLogger';
import { errorHandler } from '../errorHandler';
import { AppError } from '../../errors/AppError';
import { http } from 'winston';

describe ('Error handler middleware', () => {
    it('Should format and return known errors (AppError) alongside status and correlation ID', async () => {
        const app = express();
        app.use(httpLogger);
        app.get('/test-app-error', ()=>{
            throw new AppError('Not enough balance', 422);
        })

        app.use(errorHandler);

        const response = await request(app).get('/test-app-error');

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty('correlationId');
        expect(response.body.message).toBe('Not enough balance');
    });


    it('Should return status 500 alongside generic message for unexpected errors', async ()=> {
          const app = express();
        app.use(httpLogger);
        app.get('/test-crash', ()=>{
            throw new AppError('Unexpected error', 500);
        })
        app.use(errorHandler);


        const response = await request(app).get('/test-crash');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Unexpected error');
        expect(response.body).toHaveProperty('correlationId');
    });
});