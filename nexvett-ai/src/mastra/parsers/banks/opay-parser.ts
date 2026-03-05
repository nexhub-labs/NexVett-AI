import { BaseBankParser } from '../base-parser';
import { documentParseAgent } from '../../agents/document-parse-agent';
import { extractTextItems, TextItem } from '../utils/pdf-spatial';
import { detectTableColumns, groupIntoRows, assignItemsToColumns } from '../utils/table-detector';
import type { ParseResult, Transaction, ColumnMapping } from '../parser-types';
import { ExcelEngine, PDFEngine } from '../engines';
import { createLogger } from '../../lib/logger';

const logger = createLogger('OpayParser');

/**
 * Opay-specific parser (Server-side)
 * Handles Opay's unique multi-sheet Excel statements.
 */
export class OpayParser extends BaseBankParser {
  name = 'Opay';

  detect(content: string | any[][]): boolean {
    const searchText = this.getContentSearchText(content);
    // Stricter detection, but supports OPay's unique account types
    return /opay\s+digital\s+services|opay\s+nigeria|opay\s+technologies|transaction\s+receipt.*opay|opay.*transaction\s+receipt|wallet\s+account.*owealth|owealth.*wallet\s+account|spend\s+&\s+save|owealth\s+withdrawal/i.test(searchText);
  }

  protected async parsePDFBuffer(buffer: Buffer): Promise<ParseResult> {
    try {
      // logger.info(`PDF Buffer Size: ${buffer.length} bytes`);
      const result = await this.parsePDFSpatial(buffer);

      // Target is ~416 transactions. If we got zero or very few, fall back.
      if (result.success && result.transactions.length > 5) {
        // logger.info(`Spatial parsing successful: ${result.transactions.length} transactions`);
        return result;
      }
      // logger.warn(`Spatial parsing yielded ${result.transactions.length} results, trying other methods...`);
    } catch (spatialError: any) {
      logger.error(`❌ Spatial parsing failed: ${spatialError.message || spatialError}`);
      if (spatialError.details) logger.error(`Error details: ${JSON.stringify(spatialError.details)}`);
    }

    // FALLBACK 1: Regex-based parsing (Deterministic & Fast)
    const text = await PDFEngine.parse(buffer);
    if (!text || text.trim().length === 0) {
      return { success: false, transactions: [], errors: ['PDF appears to be empty or contains no readable text'] };
    }

    // logger.info('Attempting Regex Parsing for OPay PDF (Fallback 1)...');
    const regexResult = this.parseWithRegex(text);
    if (regexResult.success && regexResult.transactions.length > 5) {
      // logger.info(`Regex parsing successful: ${regexResult.transactions.length} transactions`);
      return regexResult;
    }

    // FALLBACK 2: Agentic Parsing (Slow & Expensive - Last Resort)
    try {
      // logger.info('Attempting Agentic Parsing for OPay PDF (Fallback 2)...');
      return await this.parseWithAgent(text);
    } catch (agentError) {
      // logger.warn(`Agentic parsing failed, returning regex result as best effort: ${agentError}`);
      return regexResult; // Return the regex result even if it was partial/empty, as it's the end of the line
    }
  }

  protected parseExcelBuffer(buffer: Buffer): ParseResult {
    const sheets = ExcelEngine.parse(buffer);
    const allTransactions: Transaction[] = [];
    const allErrors: string[] = [];
    const accounts: Array<{ accountName: string; transactions: Transaction[]; summary?: any }> = [];

    Object.entries(sheets).forEach(([sheetName, rows]) => {
      const { transactions, errors } = this.mapRowsToTransactions(rows, sheetName);
      if (transactions.length > 0) {
        accounts.push({
          accountName: sheetName,
          transactions,
          summary: this.generateSummary(transactions),
        });
        allTransactions.push(...transactions);
      }
      allErrors.push(...errors);
    });

    return {
      success: allTransactions.length > 0,
      transactions: allTransactions,
      errors: allErrors,
      summary: this.generateSummary(allTransactions),
      metadata: { bankName: 'Opay' },
      accounts,
    };
  }

  private async parsePDFSpatial(buffer: Buffer): Promise<ParseResult> {
    const items = await extractTextItems(buffer);

    // Detect columns using ALL items to get the best signal
    const columns = detectTableColumns(items);
    // logger.info(`Spatial Parse: Detected ${columns.length} columns at X=[${columns.join(', ')}]`);

    // Group items by page to avoid interleaving rows from different pages
    const itemsByPage = new Map<number, TextItem[]>();
    items.forEach(item => {
      const p = item.page || 1; // Default to 1 if missing
      if (!itemsByPage.has(p)) itemsByPage.set(p, []);
      itemsByPage.get(p)!.push(item);
    });

    const transactions: Transaction[] = [];
    const sortedPages = Array.from(itemsByPage.keys()).sort((a, b) => a - b);
    const firstPageItems = itemsByPage.get(sortedPages[0]) || [];

    // Extract metadata from headers (Opening Balance, etc.)
    const headerMetadata = this.extractHeaderMetadata(firstPageItems);
    // logger.info(`Extracted Metadata: ${JSON.stringify(headerMetadata)}`);

    const headerRow = this.detectHeaderRow(firstPageItems);
    let effectiveColumns = columns;
    let colIndices = { time: 0, date: 1, narration: 2, debit: 3, credit: 4, balance: 5 };

    if (headerRow) {
      // logger.info(`Header Row X-Coords: ${JSON.stringify(headerRow.map(h => `${h.text}(${h.x})`))}`);
      effectiveColumns = this.matchColumnsToHeaders(headerRow, columns);
      // Pass the actual items to help distinguish real data columns from spacers
      colIndices = this.mapHeaderTypesToIndices(headerRow, effectiveColumns, firstPageItems);
      // logger.info(`Final Column Indices: ${JSON.stringify(colIndices)}`);
    }

    for (const pageNum of sortedPages) {
      const pageItems = itemsByPage.get(pageNum)!;
      const rows = groupIntoRows(pageItems);
      // logger.info(`Page ${pageNum}: Found ${rows.length} visual rows`);

      const pageTransactions = rows
        .map(row => this.mapSpatialRowToTransaction(row, effectiveColumns, colIndices, pageNum))
        .filter((t): t is Transaction => t !== null);

      transactions.push(...pageTransactions);
    }

    // Normalize: Merge paired rows (e.g. Transfer Debit + OWealth Withdrawal Credit)
    const normalizedTransactions = this.mergePairedTransactions(transactions);

    if (normalizedTransactions.length > 0) {
      // logger.info(`Sample Transaction (First): ${JSON.stringify(normalizedTransactions[0])}`);
      // logger.info(`Sample Transaction (Last): ${JSON.stringify(normalizedTransactions[normalizedTransactions.length - 1])}`);
    }

    const accounts = this.categorizeTransactions(normalizedTransactions);
    // logger.info(`Categorization Result: Wallet=${accounts[0].transactions.length}, Savings=${accounts[1].transactions.length}`);

    accounts.forEach(acc => {
      // logger.info(`  - ${acc.accountName}: ${acc.transactions.length} transactions`);
    });

    return {
      success: normalizedTransactions.length > 0,
      transactions: normalizedTransactions,
      errors: [],
      summary: this.generateSummary(normalizedTransactions),
      metadata: { bankName: 'Opay', ...headerMetadata },
      accounts
    };
  }

  private mapSpatialRowToTransaction(row: TextItem[], columns: number[], colMap: any, page: number): Transaction | null {
    const cells = assignItemsToColumns(row, columns);

    const rowText = row.map(i => i.text).join(' ');
    // Guard against repeated header rows on subsequent pages
    if (/trans\.?\s*time|value\s*date|description|debit|credit|balance/i.test(rowText)) {
      return null;
    }

    // FIX: Aggregate cells for narration from narration start to debit/credit start
    // colMap indices refer to clusters. Range from colMap.narration to colMap.debit - 1
    const narrationCells: TextItem[] = [];
    for (let i = colMap.narration; i < Math.min(colMap.debit, colMap.credit); i++) {
      if (cells[i]) narrationCells.push(...cells[i]);
    }

    const transTimeStr = cells[colMap.time]?.map(i => i.text).join(' ').trim() || '';
    const descriptionStr = narrationCells.map(i => i.text).join(' ').trim() || '';
    const debitStr = cells[colMap.debit]?.map(i => i.text).join('').trim() || '--';
    const creditStr = cells[colMap.credit]?.map(i => i.text).join('').trim() || '--';
    const balanceStr = cells[colMap.balance]?.map(i => i.text).join('').trim() || '0';

    if (!transTimeStr || !/\d{2}:\d{2}:\d{2}/.test(transTimeStr)) {
      return null;
    }

    const date = this.parseDate(transTimeStr);
    if (!date) return null;

    const debit = debitStr === '--' ? 0 : this.parseAmount(debitStr);
    const credit = creditStr === '--' ? 0 : this.parseAmount(creditStr);
    const balance = this.parseAmount(balanceStr);

    const amount = debit > 0 ? debit : credit;
    const type: 'debit' | 'credit' = debit > 0 ? 'debit' : 'credit';

    if (amount === 0 && balance === 0) return null;

    return {
      date: date.toISOString(),
      amount,
      narration: descriptionStr,
      type,
      balance,
      source: 'Opay PDF (Spatial)',
      page
    };
  }

  private mergePairedTransactions(transactions: Transaction[]): Transaction[] {
    const merged: Transaction[] = [];
    let i = 0;

    while (i < transactions.length) {
      const current = transactions[i];
      const next = transactions[i + 1];

      if (
        next &&
        current.page === next.page &&
        Math.abs(
          new Date(current.date).getTime() - // using .date as .time is not on Transaction
          new Date(next.date).getTime()
        ) < 5000 &&
        (current.type === 'debit' && current.amount > 0) &&
        (next.type === 'credit' && next.amount > 0) &&
        /owealth withdrawal/i.test(next.narration)
      ) {
        merged.push({
          ...current,
          // Taking credit/balance from next is usually correct for the net effect, 
          // but for user experience we want the "Debit" effect on Wallet 
          // and ignore the inner mechanics. 
          // Actually, user wants "Transaction count" to be unique.
          // If we merge "Transfer (Dr)" + "Withdrawal (Cr)", the net result 
          // is... complicated. 
          // User said: "One logical transaction".
          // If "Transfer to X" is the primary action, we keep 'current' (Debit).
          // "OWealth Withdrawal" (Credit) is the funding source.
          // So we keep 'current' properties basically.
          // User snippet: credit: next.credit. 
          // Wait, if current is Debit 1500 and next is Credit 1500.
          // Merged row should probably remain a Debit of 1500?
          // The snippet `credit: next.credit` would turn it into a Credit?
          // User's snippet:
          // merged.push({ ...current, credit: next.credit, balance: next.balance ... })
          // If 'current' was debit, spread keeps debit type? 
          // No, Transaction type is literal 'debit'|'credit'.
          // If next.credit > 0, does that mean type='credit'?
          // The user's snippet logic implies creating a merged record.
          // Let's stick to keeping it as the primary user action (Debit).
          // If I set credit: next.credit, and type is still debit?
          // Our Transaction interface has single `amount` and `type`.
          // So we can't have both debit and credit amounts.
          // I will keep `current` (the Debit / Transfer) and just discard `next`.
          // Checking user intent: "OWealth Withdrawal... is funding source."
          // "Real transaction" is "Transfer to X".
          // So we just swallow `next`.

          // UNLESS user snippet meant to preserve next.balance?
          balance: next.balance || current.balance,

          // Keeping current.narration ("Transfer to X")

        });
        i += 2;
        continue;
      }

      merged.push(current);
      i += 1;
    }

    return merged;
  }

  private categorizeTransactions(transactions: Transaction[]) {
    const walletTransactions: Transaction[] = [];
    const savingsTransactions: Transaction[] = [];

    // Target: 758 Wallet (Debit Count 416 + Credit Count 342), 472 Savings
    // New Logic based on user feedback and directional flow:
    // - Wallet: 
    //    1. All non-OWealth transactions
    //    2. OWealth "Transaction Payment" flows that are CREDITS (Funding the wallet)
    // - Savings:
    //    1. Pure OWealth activity (Interest, Deposits)
    //    2. OWealth "Transaction Payment" flows that are DEBITS (Withdrawal from Savings)

    transactions.forEach(t => {
      const nar = t.narration.toLowerCase();
      const isOWealth = nar.includes('owealth');

      if (!isOWealth) {
        // Not related to OWealth (e.g. "Spend & Save Deposit", Airtime, Transfers)
        // These are standard Wallet activities.
        walletTransactions.push(t);
        return;
      }

      // Handle OWealth-related transactions

      const isTransactionPayment = nar.includes('(transaction payment)');

      // CASE 1: Using OWealth to pay for something (The "Funding" flow)
      // - Wallet receives money (Credit) from Savings -> Wallet Activity
      if (isTransactionPayment && t.type === 'credit') {
        walletTransactions.push(t);
        return;
      }

      // CASE 2: Transfers from Wallet TO OWealth (Debits)
      // If it's a Debit but NOT a "Withdrawal", it's likely a transfer/deposit INTO OWealth.
      // This is a Wallet outflow (Debit) and should stay in Wallet.
      // Explicit "Withdrawal" means money LEAVING Savings.
      if (t.type === 'debit' && !nar.includes('withdrawal')) {
        walletTransactions.push(t);
        return;
      }



      // All other OWealth interactions (Interest, Withdrawals-as-debits, Deposits) go to Savings
      savingsTransactions.push(t);
    });

    // logger.info(`Categorization Result: Wallet=${walletTransactions.length}, Savings=${savingsTransactions.length}`);

    return [
      { accountName: 'Wallet Account', transactions: walletTransactions, summary: this.generateSummary(walletTransactions) },
      { accountName: 'Savings', transactions: savingsTransactions, summary: this.generateSummary(savingsTransactions) }
    ];
  }

  /**
   * Scrapes metadata like Opening Balance from the top of the statement.
   */
  private extractHeaderMetadata(items: TextItem[]): any {
    const metadata: any = {};
    const sorted = [...items].sort((a, b) => b.y - a.y); // Top to bottom
    const rows = groupIntoRows(sorted, 15);

    rows.forEach(row => {
      const rowText = row.map(i => i.text).join(' ');
      // if (/Balance|Total/i.test(rowText)) logger.info(`[Metadata Scan] Checking row: "${rowText}"`);

      // Strategy: split by spaces, find all currency-like or number-like tokens
      // The log shows: "Debit Count Total Debit Opening Balance 416 ₦ 1,196,920.60 ₦ 0.00"
      // We expect 3 distinct numeric values at the end.

      const numbers = rowText.match(/([\d,]+\.\d{2}|0\.00)/g);

      if (numbers && numbers.length >= 2) {
        const val1 = this.parseAmount(numbers[0]); // Likely Total
        const val2 = this.parseAmount(numbers[1]); // Likely Balance
        const val3 = numbers[2] ? this.parseAmount(numbers[2]) : null;

        // Alignment based on log observation: 
        // 416 (Count - no decimals, missed by regex above usually or caught if formatted)
        // If regex catches 1.2M and 0.00

        if (/Opening\s*Balance/.test(rowText) && /Total\s*Debit/.test(rowText)) {
          // Order: Debit Count | Total Debit | Opening Balance
          // Values found by decimal regex: [TotalDebit, OpeningBalance]
          if (val1) metadata.totalDebitAmount = val1;
          if (val2 !== null) metadata.openingBalance = val2;
        }

        if (/Closing\s*Balance/.test(rowText) && /Total\s*Credit/.test(rowText)) {
          // Order: Credit Count | Total Credit | Closing Balance
          // Values: [TotalCredit, ClosingBalance]
          if (val1) metadata.totalCreditAmount = val1;
          if (val2 !== null) metadata.closingBalance = val2;
        }
      }
    });

    return metadata;
  }

  private async parseWithAgent(text: string): Promise<ParseResult> {
    if (text.length > 150000) {
      // logger.warn(`Text length ${text.length} is large. Agent might truncate or error.`);
    }

    const prompt = `
You are an expert financial data parser. Analyze the verified text from an OPay PDF Statement below.
Your goal is to extract ALL transactions and segment them into two accounts based on the nature of the transaction:

1. "Wallet Account": The main spending account. Includes Transfers, Airtime, Data, Betting, etc.
2. "OWealth Account": The internal savings account. ONLY includes "Auto-save to OWealth", "OWealth Withdrawal", "OWealth Interest".

Format the output as a strict JSON object with this structure:
{
  "accounts": [
    {
      "accountName": "Wallet Account",
      "transactions": [
        { "date": "ISOString", "amount": number, "type": "debit"|"credit", "narration": "string", "balance": number }
      ]
    },
    {
      "accountName": "OWealth Account",
      "transactions": [...]
    }
  ]
}

RULES:
- Extract Date, Amount, Narration, Type (debit/credit), Balance from the text lines.
- Convert dates to ISO 8601 string.
- Ensure numbers are parsed correctly (remove commas).
- Do not skip any transactions.
- Double-check the segmentation. "OWealth Withdrawal" usually Credits the Wallet, but logically belongs to the OWealth interactions history. However, user wants to see "OWealth" as a separate account bucket. 
- If a line is ambiguous, default to "Wallet Account".

TEXT CONTENT (Truncated if too large):
${text.substring(0, 50000)}
`;

    const response = await documentParseAgent.generate(prompt);

    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in agent response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    const accounts = parsedData.accounts || [];
    const allTransactions: Transaction[] = [];
    accounts.forEach((acc: any) => {
      acc.summary = this.generateSummary(acc.transactions);
      allTransactions.push(...acc.transactions);
    });

    return {
      success: allTransactions.length > 0,
      transactions: allTransactions,
      errors: [],
      summary: this.generateSummary(allTransactions),
      metadata: { bankName: 'Opay' },
      accounts
    };
  }

  private parseWithRegex(text: string): ParseResult {
    // logger.info(`Regex Parse: Input text length = ${text.length}`);
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    // logger.info(`Regex Parse: Found ${lines.length} non-empty lines`);

    // Log first 10 lines to see if they are interleaved
    // logger.info(`Regex Parse Sample Lines:\n${lines.slice(0, 10).map((l, i) => `  ${i}: ${l}`).join('\n')}`);

    const transactions: Transaction[] = [];
    const errors: string[] = [];
    const transactionBlocks: string[] = [];
    let currentBlock: string[] = [];
    const dateStartRegex = /^\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}/;

    for (const line of lines) {
      if (dateStartRegex.test(line)) {
        if (currentBlock.length > 0) {
          transactionBlocks.push(currentBlock.join(' '));
        }
        currentBlock = [line];
      } else {
        if (currentBlock.length > 0) {
          currentBlock.push(line);
        }
      }
    }
    if (currentBlock.length > 0) {
      transactionBlocks.push(currentBlock.join(' '));
    }

    const blockRegex = /^(\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2})\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+?)\s+((?:--|[\d,]+\.\d{2}))\s+((?:--|[\d,]+\.\d{2}))\s+((?:--|[\d,]+\.\d{2}))\s+(\w+)\s+([A-Za-z0-9]+)(.*)$/;

    for (const block of transactionBlocks) {
      const match = block.match(blockRegex);
      if (match) {
        try {
          const [_, transTimeStr, valueDateStr, descriptionPart1, debitStr, creditStr, balanceStr, channel, reference, trailingText] = match;

          const date = this.parseDate(transTimeStr);
          if (!date) continue;

          const debit = debitStr === '--' ? 0 : this.parseAmount(debitStr);
          const credit = creditStr === '--' ? 0 : this.parseAmount(creditStr);
          const balance = this.parseAmount(balanceStr);
          const fullDescription = (descriptionPart1 + (trailingText || '')).trim();

          let amount = 0;
          let type: 'debit' | 'credit' = 'debit';
          if (debit > 0) { amount = debit; type = 'debit'; }
          else if (credit > 0) { amount = credit; type = 'credit'; }
          else if (debit === 0 && credit === 0) continue;

          transactions.push({
            date: date.toISOString(),
            amount,
            narration: fullDescription,
            type,
            balance,
            source: 'Opay PDF',
          });

        } catch (e) {
          errors.push(`Error parsing block: "${block.substring(0, 30)}..."`);
        }
      }
    }

    const walletTransactions: Transaction[] = [];
    const owealthTransactions: Transaction[] = [];
    transactions.forEach(t => {
      const nar = t.narration.toLowerCase();
      if (nar.includes('owealth') || nar.includes('auto-save')) owealthTransactions.push(t);
      else walletTransactions.push(t);
    });

    const accounts = [
      { accountName: 'Wallet Account', transactions: walletTransactions, summary: this.generateSummary(walletTransactions) },
      { accountName: 'OWealth Account', transactions: owealthTransactions, summary: this.generateSummary(owealthTransactions) }
    ];

    return {
      success: transactions.length > 0,
      transactions,
      errors,
      summary: this.generateSummary(transactions),
      metadata: { bankName: 'Opay' },
      accounts
    };
  }

  protected detectColumns(headers: string[]): ColumnMapping {
    // Opay standard: [Date, Time, Narration, Debit, Credit, Balance, ...]
    // But we'll try to be flexible while defaulting to Opay's known positions if headers are missing
    const map = super.detectColumns(headers);
    if (map.date === undefined && headers.length >= 5) {
      return { date: 0, narration: 2, debit: 3, credit: 4, balance: 5 };
    }
    return map;
  }

  /**
   * Scans items to find standard OPay PDF headers.
   */
  private detectHeaderRow(items: TextItem[]): TextItem[] | null {
    // Sort by Y to scan rows
    const sorted = [...items].sort((a, b) => b.y - a.y);
    const rows = groupIntoRows(sorted, 10);

    const requiredPatterns = [
      /Trans\.?\s*Time/i,
      /Description/i,
      /Debit/i,
      /Credit/i,
      /Balance/i
    ];

    for (const row of rows) {
      const rowText = row.map(i => i.text).join(' ');
      const matches = requiredPatterns.filter(p => p.test(rowText)).length;
      if (matches >= 3) {
        // Found the header row! 
        // Sort items by X to return ordered headers
        return row.sort((a, b) => a.x - b.x);
      }
    }
    return null;
  }

  /**
   * Matches discovered header items to the statistically detected column clusters.
   * This filters out "noise" columns (ghost columns in Description) and snaps headers to data columns.
   */
  private matchColumnsToHeaders(headerRow: TextItem[], allClusters: number[]): number[] {
    const resultColumns: number[] = [];

    // Known header mapping order for OPay
    // We expect headers in specific order in the PDF row.
    const startMap = {
      'time': 0, // Trans Time
      'date': 1, // Value Date
      'description': 2,
      'debit': 3,
      'credit': 4,
      'balance': 5,
      'channel': 6,
      'ref': 7
    };

    // Extract raw header Xs
    // We identify which TextItem corresponds to which column type
    const headerDefs: { type: string, x: number }[] = [];

    headerRow.forEach(item => {
      const t = item.text.toLowerCase();
      if (t.includes('time')) headerDefs.push({ type: 'time', x: item.x });
      else if (t.includes('value') && t.includes('date')) headerDefs.push({ type: 'date', x: item.x });
      else if (t.includes('description')) headerDefs.push({ type: 'description', x: item.x });
      else if (t.includes('debit')) headerDefs.push({ type: 'debit', x: item.x });
      else if (t.includes('credit')) headerDefs.push({ type: 'credit', x: item.x });
      else if (t.includes('balance')) headerDefs.push({ type: 'balance', x: item.x });
      else if (t.includes('channel')) headerDefs.push({ type: 'channel', x: item.x });
      else if (t.includes('ref')) headerDefs.push({ type: 'ref', x: item.x });
    });

    // Filter duplicate headers (take leftmost)
    // and sort by X
    const uniqueHeaders = headerDefs.sort((a, b) => a.x - b.x);

    // For each header, find the closest cluster
    // Use wider tolerance (100px) to capture all data variations
    uniqueHeaders.forEach(h => {
      const bestCluster = allClusters.reduce((closest, curr) => {
        return Math.abs(curr - h.x) < Math.abs(closest - h.x) ? curr : closest;
      }, allClusters[0]);

      if (Math.abs(bestCluster - h.x) < 100) {
        resultColumns.push(bestCluster);
      } else {
        resultColumns.push(h.x); // Default to header position if data is sparse
      }
    });

    return resultColumns.sort((a, b) => a - b);
  }

  /**
   * Maps header types to their finalized column indices after refinement.
   */
  private mapHeaderTypesToIndices(headerRow: TextItem[], refinedClusters: number[], allItems: TextItem[]): any {
    const map: any = { time: 0, date: 1, narration: 2, debit: 3, credit: 4, balance: 5 };

    // Analyze density of data in each cluster to distinguish spacers
    const clusterDensity = refinedClusters.map(cX => {
      return allItems.filter(i => Math.abs(i.x - cX) < 10 && i.y > 100 && i.y < 700).length;
    });

    headerRow.forEach(item => {
      const t = item.text.toLowerCase();

      // Find the ABSOLUTE closest cluster
      let closestIdx = -1;
      let minDistance = Infinity;

      refinedClusters.forEach((clusterX, idx) => {
        const dist = Math.abs(clusterX - item.x);
        // Favor clusters with actual data density for data columns
        const isDataColumn = clusterDensity[idx] > 5;
        const adjustedDist = isDataColumn ? dist : dist + 20; // Penalty for low-density clusters (spacers)

        if (adjustedDist < minDistance) {
          minDistance = adjustedDist;
          closestIdx = idx;
        }
      });

      if (closestIdx === -1 || minDistance > 80) return;

      if (t.includes('time')) map.time = closestIdx;
      else if (t.includes('value') && t.includes('date')) map.date = closestIdx;
      else if (t.includes('description')) map.narration = closestIdx;
      else if (t.includes('debit')) map.debit = closestIdx;
      else if (t.includes('credit')) map.credit = closestIdx;
      else if (t.includes('balance')) map.balance = closestIdx;
    });

    return map;
  }
}
