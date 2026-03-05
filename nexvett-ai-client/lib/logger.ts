import { sanitize } from '@nexvett-ai/shared';

/**
 * Client-side Logger that automatically sanitizes data before logging.
 */
class Logger {
    private name: string;

    constructor(name: string = 'NexVettAI') {
        this.name = name;
    }

    private formatMessage(level: string, message: string) {
        return `[${this.name}] [${level}] ${message}`;
    }

    private sanitizeArgs(args: unknown[]) {
        return args.map(arg => sanitize(arg));
    }

    info(message: string, ...args: unknown[]) {
        console.info(this.formatMessage('INFO', message), ...this.sanitizeArgs(args));
    }

    warn(message: string, ...args: unknown[]) {
        console.warn(this.formatMessage('WARN', message), ...this.sanitizeArgs(args));
    }

    error(message: string, ...args: unknown[]) {
        console.error(this.formatMessage('ERROR', message), ...this.sanitizeArgs(args));
    }

    debug(message: string, ...args: unknown[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(this.formatMessage('DEBUG', message), ...this.sanitizeArgs(args));
        }
    }
}

export const createLogger = (name: string) => new Logger(name);
export const logger = createLogger('NexVettAI');
