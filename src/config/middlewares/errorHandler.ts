import {Request, Response, NextFunction} from 'express';
import { AppError } from '../errors/AppError';
import logger from '../logger';

export function errorHandler (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const correlationId = req.correlationId || 'N/A';
    const context = 'ErrorHandler';

    if(err instanceof AppError){
        logger.warn(`AppError: ${err.message}`, {
            context,
            correlationId,
            statusCode: err.statusCode,
            details: err.details,
            path: req.originalUrl,
            method: req.method
        });

        res.status(err.statusCode).json({
            status: 'error',
            correlationId,
            message: err.message,
            ...(err.details ? {details: err.details } : {})
        });
        return;
    }

    logger.error(`Unhandled Error: ${err.message}`, {
        context,
        correlationId,
        error: {
            message: err.message,
            stack : err.stack,
            name: err.name
        },
        path: req.originalUrl,
        method: req.method
    })

    res.status(500).json({
        status: 'error',
        correlationId,
        message: 'Internal Server Error'
    });
}