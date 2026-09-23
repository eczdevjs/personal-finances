import {Request, Response, NextFunction} from 'express';
import {randomUUID} from 'crypto';
import logger from '../logger';
import { method } from 'lodash';

// Estende a interface do Express para tipar a propriedade correlationId no objeto req => pesquisar sobre isto
declare global {
    namespace Express {
        interface Request {
            correlationId?: string
        }
    }
}

export function httpLogger(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    const headerCorrelationId = req.headers['x-correlation-id'];

    const correlationId = Array.isArray(headerCorrelationId) ? headerCorrelationId[0] : headerCorrelationId || randomUUID();

    req.correlationId = correlationId;


    res.setHeader('X-Correlation-ID', correlationId);

    // log entrada requisicao
    const context = 'HTTP';

    logger.info(`--> ${req.method} ${req.originalUrl}`, {
        context,
        correlationId,
        method: req.method,
        url : req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    res.on('finish', ()=>{
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        const logPayload = {
            context,
            correlationId,
            method: req.method,
            url: req.originalUrl,
            statusCode,
            durationMs
        }

        const message = `<-- ${req.method} ${req.originalUrl} ${statusCode} - ${durationMs}`;

        if(statusCode >= 500){
            logger.error(message, logPayload);
        } else if (statusCode >= 400){
            logger.warn(message, logPayload);
        }else {
            logger.info(message, logPayload);
        }


    })

    next();
}