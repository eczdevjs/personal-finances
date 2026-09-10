import winston from "winston";
import { clone, cloneDeep } from "lodash";

const SENSITIVE_KEYS = [
    'password',
    'senha',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'creditCard',
    'cardNumber',
    'cvv',
    'secret'
]


// FUNCAO PARA OCULTAR VALORES DE CHAVES SENSIVEIS

function sanitizeObject(obj: Record<string, any>): Record<string, any> {
    if (typeof obj != 'object') {
        return obj;
    }


    if (obj instanceof Error) {
        return {
            message: obj.message,
            stack: obj.stack,
            name: obj.name
        };
    }


    const sanitized = cloneDeep(obj);

    function walkAndRedact(target: Record<string, any>) {
        for (const key of Object.keys(target)) {
            if (SENSITIVE_KEYS.includes(key.toLocaleLowerCase())) {
                target[key] = '[REDACTED]';
            } else if (target[key] instanceof Error) {
                // Preserva message, stack e name caso o erro venha aninhado (ex: { error: new Error() })
                target[key] = {
                    message: target[key].message,
                    stack: target[key].stack,
                    name: target[key].name
                };
            } else if (typeof target[key] === 'object' && target[key] != null) {
                walkAndRedact(target[key]);
            }
        }

    }

    walkAndRedact(sanitized);

    return sanitized;
}



// formato customizado do winston para aplicar a sanitizacao

const redactSensitiveData = winston.format((info) => {
    return sanitizeObject(info) as winston.Logform.TransformableInfo;
})

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// instancia principal do Logger com winston

const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        redactSensitiveData(),
        isProduction
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    ({ timestamp, level, message, context, ...metadata }) => {
                        const contextStr = context ? `[${context}]` : '';
                        const metaStr = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';

                        return `${timestamp} ${level} ${contextStr}: ${message} ${metaStr}`;
                    })
            )
    ),
    transports: [
        new winston.transports.Console()
    ]
});

export default logger;