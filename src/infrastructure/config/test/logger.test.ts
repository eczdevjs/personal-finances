import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import logger from '../logger';

describe('Logger configuration (WINSTON)', () => {
    let logSpy: MockInstance;

    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('Should mask sensitive data into logs', () => {
        let loggedOutput = '';
        const handleLog = (info: any) => {
            loggedOutput = JSON.stringify(info);
        }

        logger.once('data', handleLog);

        logger.info('Tentativa login', {
            context: 'AuthService',
            payload: {
                email: 'userexample@winston.com',
                password: '12345',
                token: 'eyJhbGciOiJIUzI1NiR5...'
            }
        });

        expect(loggedOutput).toContain('userexample@winston.com');
        expect(loggedOutput).toContain('[REDACTED]');
        expect(loggedOutput).not.toContain('12345');
        expect(loggedOutput).not.toContain('eyJhbGciOiJIUzI1NiR5...');
    });

    it('Should register errors with stack trace', () => {
        let loggedOutput = '';
        const handleLog = (info: any) => {
            loggedOutput = JSON.stringify(info);
        }

        logger.once('data', handleLog);
        const errorMessage = 'Erro simulado de banco dados'
        const error = new Error(errorMessage);

        logger.error('Conection Fail', {
            context: 'DatabaseConnection',
            error
        });

  
        expect(loggedOutput).toContain(errorMessage);
    });

});