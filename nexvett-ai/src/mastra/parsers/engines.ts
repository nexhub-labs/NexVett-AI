import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { extractText, extractTextItems } from './utils/pdf-spatial';

/**
 * Technical Parsing Engines (SRP: Technical Extraction Only)
 * These engines handle the raw conversion of buffers to data structures.
 * They know nothing about banks, transactions, or domain logic.
 *
 * PDF extraction is backed exclusively by pdfjs-dist — no secondary PDF library.
 */

export const CSVEngine = {
    parse(buffer: Buffer): any[][] {
        const content = buffer.toString('utf-8');
        return csvParse(content, {
            columns: false,
            skip_empty_lines: true,
            trim: true,
        });
    }
};

export const ExcelEngine = {
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
     * Extracts flat text from a PDF buffer.
     * Used by line-based parsers (e.g. GTBank).
     */
    async parse(buffer: Buffer): Promise<string> {
        return extractText(buffer);
    },

    /**
     * Extracts spatially-positioned text items from a PDF buffer.
     * Used by column-based parsers (e.g. Opay).
     */
    extractItems: extractTextItems,
};
