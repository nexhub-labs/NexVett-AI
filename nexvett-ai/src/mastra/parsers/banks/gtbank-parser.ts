import { BaseBankParser } from '../base-parser';
import type { ParseResult, Transaction } from '../parser-types';
import { PDFEngine } from '../engines';

/**
 * GTBank-specific parser (Server-side)
 * Uses specialized PDF extraction for GTBank layouts.
 */
export class GTBankParser extends BaseBankParser {
  name = 'GTBank';

  detect(content: string | any[][]): boolean {
    const searchText = this.getContentSearchText(content);

    return /guaranty\s+trust\s+bank|guaranty\s+trust\s+bank\s+plc|gtbank|gt\s+bank|gtco|guaranty\s+trust\s+holding\s+company/i.test(searchText);
  }

  // GTBank PDF logic is unique enough to require an override
  protected async parsePDFBuffer(buffer: Buffer): Promise<ParseResult> {
    const text = await PDFEngine.parse(buffer);
    if (!text || text.trim().length === 0) {
      return { success: false, transactions: [], errors: ['PDF appears to be empty or contains no readable text'] };
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const transactions: Transaction[] = [];
    const errors: string[] = [];

    const rowStart = /^(\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+(\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+/;
    const rows: string[] = [];
    let currentRow: string | null = null;

    for (const line of lines) {
      if (rowStart.test(line)) {
        if (currentRow) rows.push(currentRow);
        currentRow = line;
      } else if (currentRow) {
        currentRow += ` ${line}`;
      }
    }
    if (currentRow) rows.push(currentRow);

    let lastBalance: number | null = null;

    for (const row of rows) {
      const headerMatch = row.match(rowStart);
      if (!headerMatch) continue;

      const date = this.parseDate(headerMatch[1]);
      if (!date) continue;

      const amountMatches = [...row.matchAll(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g)].map(m => m[0]);
      if (amountMatches.length < 2) continue;

      const amounts = amountMatches.map(a => this.parseAmount(a));
      const balance = amounts[amounts.length - 1];
      const txnCandidates = amounts.slice(0, -1);
      const narration = row.replace(rowStart, '').trim() || 'No description';

      let debitAmount = 0;
      let creditAmount = 0;

      if (txnCandidates.length >= 2) {
        debitAmount = txnCandidates[0];
        creditAmount = txnCandidates[1];
      } else {
        const a = txnCandidates[0] ?? 0;
        if (lastBalance !== null && balance !== 0) {
          if (balance > lastBalance) creditAmount = a;
          else if (balance < lastBalance) debitAmount = a;
          else if (/(\bcr\b|credit)/i.test(row)) creditAmount = a;
          else debitAmount = a;
        } else if (/(\bcr\b|credit)/i.test(row)) {
          creditAmount = a;
        } else {
          debitAmount = a;
        }
      }

      if (debitAmount > 0) transactions.push({ date: date.toISOString(), amount: debitAmount, narration, type: 'debit', balance });
      if (creditAmount > 0) transactions.push({ date: date.toISOString(), amount: creditAmount, narration, type: 'credit', balance });

      lastBalance = balance;
    }

    return {
      success: transactions.length > 0,
      transactions,
      errors,
      summary: this.generateSummary(transactions),
      metadata: { bankName: 'GTBank' },
    };
  }
}
