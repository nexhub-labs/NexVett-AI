import { CSVEngine, ExcelEngine, PDFEngine } from './engines';
import type { BankParser } from './parser-types';
import { GTBankParser } from './banks/gtbank-parser';
import { OpayParser } from './banks/opay-parser';

/**
 * Detects which bank parser to use based on file content (Server-side)
 * SRP: Discovery of the correct adapter. Uses Engines for extraction.
 */
export class BankDetector {
  private parsers: BankParser[] = [
    new OpayParser(),
    new GTBankParser(),
  ];

  async detectParser(buffer: Buffer, filename: string): Promise<BankParser> {
    const extension = filename.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'csv') return this.detectFromCSV(buffer);
      if (extension === 'xlsx' || extension === 'xls') return this.detectFromExcel(buffer);
      if (extension === 'pdf') return await this.detectFromPDF(buffer);
    } catch (error) {
      throw new Error(`Detection failed: ${error instanceof Error ? error.message : 'Unknown reason'}`);
    }

    throw new Error('Unsupported file format');
  }

  private detectFromCSV(buffer: Buffer): BankParser {
    const content = buffer.toString('utf-8');
    const parser = this.parsers.find(p => p.detect(content));
    if (!parser) throw new Error('Bank not recognized from CSV content');
    return parser;
  }

  private detectFromExcel(buffer: Buffer): BankParser {
    const sheets = ExcelEngine.parse(buffer);

    // Check every sheet until we find a match (SRP: Robust Discovery)
    for (const sheetData of Object.values(sheets)) {
      const parser = this.parsers.find(p => p.detect(sheetData));
      if (parser) return parser;
    }

    throw new Error('Bank not recognized from Excel content');
  }

  private async detectFromPDF(buffer: Buffer): Promise<BankParser> {
    const text = await PDFEngine.parse(buffer);
    const parser = this.parsers.find(p => p.detect(text));
    if (!parser) throw new Error('Bank not recognized from PDF content');
    return parser;
  }
}
