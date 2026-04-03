import { BankDetector } from '../parsers';
import type { ParseResult } from '../parsers';
import { createLogger } from '../lib/logger';

const logger = createLogger('ParseFile');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * API endpoint to parse bank statement files.
 * Accepts file buffer, parses in memory, returns transaction JSON.
 * NO file storage - privacy-first.
 */
export async function parseFile(buffer: Buffer, filename: string): Promise<ParseResult> {
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      success: false,
      transactions: [],
      errors: [`File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds the 10MB limit`],
    };
  }

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
    // Never log full error object — stack may contain parser internals or partial file content
    logger.error(`ParseFile Error: ${message}`);
    return {
      success: false,
      transactions: [],
      errors: [message],
    };
  }
}
