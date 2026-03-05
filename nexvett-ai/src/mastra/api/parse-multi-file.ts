import { BankDetector } from '../parsers';
import type { ParseResult, FileMetadata } from '@nexvett-ai/shared';
import { v7 as uuidv7 } from 'uuid';
import { createLogger } from '../lib/logger';

const logger = createLogger('MultiFileParse');

/**
 * Re-export shared metadata type
 */
export type { FileMetadata };

/**
 * Result from parsing a single file in multi-file context
 */
export interface ParsedFileResult {
  fileId: string;
  fileName: string;
  parseResult: ParseResult;
  metadata: FileMetadata;
}

/**
 * Result from parsing multiple files
 */
export interface MultiFileParseResult {
  success: boolean;
  files: ParsedFileResult[];
  errors: string[];
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalTransactions: number;
  };
}

/**
 * Parse multiple bank statement files
 * Each file is parsed independently with metadata tracking
 * NO file storage - privacy-first architecture
 */
export async function parseMultipleFiles(
  files: Array<{ buffer: Buffer; filename: string; size: number }>
): Promise<MultiFileParseResult> {
  const detector = new BankDetector();

  // logger.info(`Starting parse for ${files.length} files`);

  const parsePromises = files.map(async (file) => {
    const fileId = uuidv7();
    const fileType = getFileType(file.filename);

    try {
      // logger.info(`Parsing ${file.filename} (${fileId})`);

      const parser = await detector.detectParser(file.buffer, file.filename);
      const parseResult = await parser.parse(file.buffer, file.filename);

      const metadata: FileMetadata = {
        id: fileId,
        name: file.filename,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        type: fileType,
      };

      if (parseResult.success) {
        // logger.info(`${file.filename}: ${parseResult.transactions.length} transactions`);
      } else {
        logger.warn(`${file.filename}: Parse failed`);
      }

      return {
        fileId,
        fileName: file.filename,
        parseResult,
        metadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`${file.filename}: ${errorMessage}`);

      const metadata: FileMetadata = {
        id: fileId,
        name: file.filename,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        type: fileType,
      };

      return {
        fileId,
        fileName: file.filename,
        parseResult: {
          success: false,
          transactions: [],
          errors: [errorMessage],
        },
        metadata,
      };
    }
  });

  const parsedFiles = await Promise.all(parsePromises);
  const errors: string[] = [];
  let totalTransactions = 0;

  parsedFiles.forEach(f => {
    if (f.parseResult.success) {
      totalTransactions += f.parseResult.transactions.length;
    } else {
      errors.push(`${f.fileName}: ${f.parseResult.errors.join(', ')}`);
    }
  });

  const successfulFiles = parsedFiles.filter((f) => f.parseResult.success).length;
  const failedFiles = parsedFiles.length - successfulFiles;

  // logger.info(`Complete: ${successfulFiles}/${files.length} successful, ${totalTransactions} total transactions`);

  return {
    success: successfulFiles > 0,
    files: parsedFiles,
    errors,
    summary: {
      totalFiles: files.length,
      successfulFiles,
      failedFiles,
      totalTransactions,
    },
  };
}

/**
 * Determine file type from filename extension
 */
function getFileType(filename: string): 'csv' | 'xlsx' | 'pdf' {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'pdf') return 'pdf';
  return 'csv'; // default
}
