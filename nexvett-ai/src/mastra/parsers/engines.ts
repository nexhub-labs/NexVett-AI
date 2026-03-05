import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { createLogger } from '../lib/logger';

const logger = createLogger('PDFEngine');

/**
 * Technical Parsing Engines (SRP: Technical Extraction Only)
 * These engines handle the raw conversion of buffers to data structures.
 * They know nothing about banks, transactions, or domain logic.
 */

export const CSVEngine = {
    /**
     * Parses a CSV buffer into a grid of strings.
     */
    parse(buffer: Buffer): any[][] {
        const content = buffer.toString('utf-8');
        const records = csvParse(content, {
            columns: false, // Return raw rows
            skip_empty_lines: true,
            trim: true,
        });
        return records;
    }
};

export const ExcelEngine = {
    /**
     * Parses an Excel buffer into a map of sheet names to grids.
     */
    parse(buffer: Buffer): Record<string, any[][]> {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const result: Record<string, any[][]> = {};

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            result[sheetName] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        });

        return result;
    }
};

export const PDFEngine = {
    /**
     * Parses a PDF buffer into raw text.
     */
    async parse(buffer: Buffer): Promise<string> {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        // logger.info(`PDFEngine extracted ${result.text?.length || 0} chars`);
        // if (!result.text) logger.warn('PDFEngine warning: extracted text is empty');
        return result.text || '';
    }
};
