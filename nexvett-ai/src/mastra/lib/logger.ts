import { LogLevel, PinoLogger } from '@mastra/loggers';
import { sanitize } from '@nexvett-ai/shared';
import * as fs from 'fs';
import * as path from 'path';

// --- File Logging Setup ---
const LOG_DIR = path.join(process.cwd(), 'logs');
const APP_LOG_FILE = path.join(LOG_DIR, 'app.jsonl');

// Ensure directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create a high-performance append stream
const appLogStream = fs.createWriteStream(APP_LOG_FILE, { flags: 'a', encoding: 'utf8' });

export class Logger {
    private logger: PinoLogger;
    private name: string;

    constructor(name: string = 'NexVettAI', level: LogLevel = 'info') {
        this.name = name;
        this.logger = new PinoLogger({
            name,
            level,
        });
    }

    private persist(level: string, message: string, ...args: any[]) {
        try {
            const entry = {
                timestamp: Date.now(),
                level,
                name: this.name,
                message,
                args: this.sanitizeArgs(args)
            };
            appLogStream.write(JSON.stringify(entry) + '\n');
        } catch (err) {
            // If file logging fails, we already have console output via Pino
        }
    }

    private sanitizeArgs(args: any[]) {
        return args.map(arg => sanitize(arg));
    }

    info(message: string, ...args: any[]) {
        this.logger.info(message, ...this.sanitizeArgs(args));
        this.persist('info', message, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.logger.warn(message, ...this.sanitizeArgs(args));
        this.persist('warn', message, ...args);
    }

    error(message: string, ...args: any[]) {
        this.logger.error(message, ...this.sanitizeArgs(args));
        this.persist('error', message, ...args);
    }

    debug(message: string, ...args: any[]) {
        this.logger.debug(message, ...this.sanitizeArgs(args));
        this.persist('debug', message, ...args);
    }
}

/**
 * Create a logger instance for a specific component.
 * @param name Component name
 * @returns Logger instance
 */
export const createLogger = (name: string) => {
    return new Logger(name);
};

// Default logger
export const logger = createLogger('NexVettAI');
