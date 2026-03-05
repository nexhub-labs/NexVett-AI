import type { BankParser, ParseResult, Transaction, ColumnMapping } from './parser-types';
import { CSVEngine, ExcelEngine, PDFEngine } from './engines';

/**
 * Base Class for all Bank Parsers (SRP: Orchestration & Workflow)
 * This class handles the routing between file types and defines the 
 * standard mapping workflow. It depends on "Engines" for raw extraction.
 */
export abstract class BaseBankParser implements BankParser {
  abstract name: string;

  /**
   * Each parser must implement a way to detect if a file belongs to its bank.
   */
  abstract detect(content: string | any[][]): boolean;

  /**
   * Helper for detection logic string search
   */
  protected getContentSearchText(content: string | any[][]): string {
    const text = typeof content === 'string'
      ? content
      : JSON.stringify(content);

    if (text.length <= 3000) return text;

    // Scan Top (for Header) and Bottom (for Footer/Disclaimer)
    // Skipping the middle to avoid matching transaction history descriptions
    return text.substring(0, 1000) + '\n...\n' + text.substring(text.length - 1000);
  }

  /**
   * Main entry point (Routing Logic)
   */
  async parse(buffer: Buffer, filename: string): Promise<ParseResult> {
    const extension = filename.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'csv') {
        return this.parseCSVBuffer(buffer);
      } else if (extension === 'xlsx' || extension === 'xls') {
        return this.parseExcelBuffer(buffer);
      } else if (extension === 'pdf') {
        return await this.parsePDFBuffer(buffer);
      }
    } catch (error) {
      return {
        success: false,
        transactions: [],
        errors: [`${this.name} ${extension} parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }

    return {
      success: false,
      transactions: [],
      errors: [`Unsupported file format for ${this.name}: ${extension}`],
    };
  }

  /**
   * Shared CSV Workflow
   */
  protected parseCSVBuffer(buffer: Buffer): ParseResult {
    const rows = CSVEngine.parse(buffer);
    if (!rows || rows.length === 0) {
      return { success: false, transactions: [], errors: ['No data found in CSV'] };
    }

    const { transactions, errors } = this.mapRowsToTransactions(rows);

    return {
      success: transactions.length > 0,
      transactions,
      errors,
      summary: this.generateSummary(transactions),
    };
  }

  /**
   * Shared Excel Workflow
   */
  protected parseExcelBuffer(buffer: Buffer): ParseResult {
    const sheets = ExcelEngine.parse(buffer);
    const allTransactions: Transaction[] = [];
    const allErrors: string[] = [];

    Object.entries(sheets).forEach(([sheetName, rows]) => {
      const { transactions, errors } = this.mapRowsToTransactions(rows, sheetName);
      allTransactions.push(...transactions);
      allErrors.push(...errors);
    });

    return {
      success: allTransactions.length > 0,
      transactions: allTransactions,
      errors: allErrors,
      summary: this.generateSummary(allTransactions),
    };
  }

  /**
   * Shared PDF Workflow (Subclasses often override this)
   */
  protected async parsePDFBuffer(buffer: Buffer): Promise<ParseResult> {
    const text = await PDFEngine.parse(buffer);
    const lines = text.split('\n').filter(l => l.trim().length > 20);
    const transactions: Transaction[] = [];

    // Simple default heuristic for PDF lines
    for (const line of lines) {
      const dateMatch = line.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
      const amountMatch = line.match(/([₦\d,]+\.\d{2})/);

      if (dateMatch && amountMatch) {
        const date = this.parseDate(dateMatch[1]);
        const amount = this.parseAmount(amountMatch[1]);
        if (date && amount > 0) {
          transactions.push({
            date: date.toISOString(),
            amount,
            narration: line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim() || 'No description',
            type: 'debit',
          });
        }
      }
    }

    return {
      success: transactions.length > 0,
      transactions,
      errors: transactions.length === 0 ? ['No transactions found in PDF'] : [],
      summary: this.generateSummary(transactions),
    };
  }

  /**
   * Generic Mapper: Turns raw grid data (any[][]) into Transactions
   */
  protected mapRowsToTransactions(rows: any[][], source?: string): { transactions: Transaction[]; errors: string[] } {
    const transactions: Transaction[] = [];
    const errors: string[] = [];

    if (rows.length < 2) return { transactions, errors };

    const headers = rows[0].map((h: any) => h?.toString() || '');
    const columnMap = this.detectColumns(headers);

    if (columnMap.date === undefined) {
      errors.push(`Could not detect date column in ${source || 'file'}`);
      return { transactions, errors };
    }

    const dateIdx = columnMap.date;
    const debitIdx = columnMap.debit;
    const creditIdx = columnMap.credit;
    const amountIdx = columnMap.amount;
    const narrationIdx = columnMap.narration;
    const balanceIdx = columnMap.balance;

    for (let i = 1; i < rows.length; i++) {
      try {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const date = this.parseDate(row[dateIdx]?.toString() || '');
        if (!date) continue;

        let amount = 0;
        let type: 'debit' | 'credit' = 'debit';

        if (debitIdx !== undefined && creditIdx !== undefined) {
          const dr = this.parseAmount(row[debitIdx]?.toString());
          const cr = this.parseAmount(row[creditIdx]?.toString());
          if (dr > 0) { amount = dr; type = 'debit'; }
          else if (cr > 0) { amount = cr; type = 'credit'; }
        } else if (amountIdx !== undefined) {
          amount = this.parseAmount(row[amountIdx]?.toString());
          type = amount < 0 ? 'debit' : 'credit';
          amount = Math.abs(amount);
        }

        if (amount === 0) continue;

        transactions.push({
          date: date.toISOString(),
          amount,
          narration: narrationIdx !== undefined ? row[narrationIdx]?.toString() || 'No description' : 'No description',
          type,
          balance: balanceIdx !== undefined ? this.parseAmount(row[balanceIdx]?.toString()) : undefined,
          source,
        });
      } catch (e) {
        errors.push(`Row ${i}: Mapping error`);
      }
    }

    return { transactions, errors };
  }

  /**
   * Shared Utilities
   */
  protected parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const formats = [
      /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/,
      /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
      /(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})/,
    ];
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (match[2] && /^[A-Za-z]{3}$/.test(match[2])) {
          const day = parseInt(match[1]);
          const monStr = match[2].toLowerCase();
          const year = parseInt(match[3]);
          const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
          if (months[monStr] !== undefined) return new Date(year, months[monStr], day);
        }

        const [, p1, p2, p3] = match;
        let yearP3 = parseInt(p3);
        if (yearP3 < 100) yearP3 += 2000;

        // Try DD/MM/YYYY interpretation (p3 as year, p1 as day)
        const d1 = new Date(yearP3, parseInt(p2) - 1, parseInt(p1));
        if (!isNaN(d1.getTime()) && d1.getFullYear() === yearP3) return d1;

        // Try YYYY-MM-DD interpretation (p1 as year, p3 as day)
        const yearP1 = parseInt(p1);
        const d2 = new Date(yearP1, parseInt(p2) - 1, parseInt(p3));
        if (!isNaN(d2.getTime()) && d2.getFullYear() === yearP1) return d2;
      }
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  protected parseAmount(amountStr: any): number {
    if (amountStr === undefined || amountStr === null) return 0;
    const cleaned = amountStr.toString().replace(/[₦,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  protected detectColumns(headers: string[]): ColumnMapping {
    const columnMap: ColumnMapping = {};
    const patterns = {
      date: /date|trans.*date|posting.*date|value.*date/i,
      amount: /amount|debit|credit/i,
      debit: /debit|withdrawal|dr\b/i,
      credit: /credit|deposit|cr\b/i,
      narration: /narration|description|details|remarks|particulars/i,
      balance: /balance|bal\b/i,
      reference: /ref|reference/i,
    };
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().trim();
      Object.entries(patterns).forEach(([key, pattern]) => {
        if (pattern.test(normalized) && !columnMap[key as keyof ColumnMapping]) {
          columnMap[key as keyof ColumnMapping] = index;
        }
      });
    });
    return columnMap;
  }

  protected generateSummary(transactions: Transaction[]) {
    if (transactions.length === 0) return undefined;
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    return {
      totalTransactions: transactions.length,
      totalDebit,
      totalCredit,
      dateRange: {
        start: dates[0]?.toISOString() || null,
        end: dates[dates.length - 1]?.toISOString() || null
      },
    };
  }
}
