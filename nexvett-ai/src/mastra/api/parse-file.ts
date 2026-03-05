import { BankDetector } from '../parsers';
import type { ParseResult } from '../parsers';
import { createLogger } from '../lib/logger';

const logger = createLogger('ParseFile');

/**
 * API endpoint to parse bank statement files
 * Accepts file buffer, parses in memory, returns transaction JSON
 * NO file storage - privacy-first
 */
export async function parseFile(buffer: Buffer, filename: string): Promise<ParseResult> {
  try {
    const detector = new BankDetector();
    const parser = await detector.detectParser(buffer, filename);

    // logger.info(`Using ${parser.name} parser for ${filename}`);

    const result = await parser.parse(buffer, filename);

    // Buffer will be garbage collected after this function returns
    // No file storage, no persistence

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Parse File Error: ${message}`, { error }); // Log the full error for debugging
    return {
      success: false,
      transactions: [],
      errors: [message],
    };
  }
}
