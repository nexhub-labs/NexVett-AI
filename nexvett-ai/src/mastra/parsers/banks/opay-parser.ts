import { BaseBankParser } from '../base-parser';
import { extractTextItems, TextItem } from '../utils/pdf-spatial';
import { detectTableColumns, groupIntoRows, assignItemsToColumns } from '../utils/table-detector';
import type { ParseResult, Transaction, ColumnMapping } from '../parser-types';
import { ExcelEngine, PDFEngine } from '../engines';
import { createLogger } from '../../lib/logger';

const logger = createLogger('OpayParser');

interface SpatialColumnMap {
    time: number;
    date: number;
    narration: number;
    debit: number;
    credit: number;
    balance: number;
}

interface StatementMetadata {
    bankName: string;
    openingBalance?: number;
    closingBalance?: number;
    totalDebitAmount?: number;
    totalCreditAmount?: number;
}

/**
 * Opay-specific parser (Server-side)
 * Handles Opay's unique multi-sheet Excel statements and spatial PDF layout.
 */
export class OpayParser extends BaseBankParser {
    name = 'Opay';

    detect(content: string | any[][]): boolean {
        const searchText = this.getContentSearchText(content);
        return /opay\s+digital\s+services|opay\s+nigeria|opay\s+technologies|transaction\s+receipt.*opay|opay.*transaction\s+receipt|wallet\s+account.*owealth|owealth.*wallet\s+account|spend\s+&\s+save|owealth\s+withdrawal/i.test(searchText);
    }

    protected async parsePDFBuffer(buffer: Buffer): Promise<ParseResult> {
        try {
            const result = await this.parsePDFSpatial(buffer);
            if (result.success && result.transactions.length > 5) return result;
        } catch (spatialError: unknown) {
            const message = spatialError instanceof Error ? spatialError.message : 'unknown error';
            logger.error(`Spatial parsing failed: ${message}`);
        }

        // Fallback: Regex-based parsing (deterministic)
        const text = await PDFEngine.parse(buffer);
        if (!text || text.trim().length === 0) {
            return { success: false, transactions: [], errors: ['PDF appears to be empty or contains no readable text'] };
        }

        return this.parseWithRegex(text);
    }

    protected parseExcelBuffer(buffer: Buffer): ParseResult {
        const sheets = ExcelEngine.parse(buffer);
        const allTransactions: Transaction[] = [];
        const allErrors: string[] = [];
        const accounts: Array<{ accountName: string; transactions: Transaction[]; summary?: ReturnType<typeof this.generateSummary> }> = [];

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
            metadata: { bankName: 'Opay' } satisfies StatementMetadata,
            accounts,
        };
    }

    private async parsePDFSpatial(buffer: Buffer): Promise<ParseResult> {
        const items = await extractTextItems(buffer);
        const columns = detectTableColumns(items);

        const itemsByPage = new Map<number, TextItem[]>();
        items.forEach(item => {
            const p = item.page ?? 1;
            if (!itemsByPage.has(p)) itemsByPage.set(p, []);
            itemsByPage.get(p)!.push(item);
        });

        const transactions: Transaction[] = [];
        const sortedPages = [...itemsByPage.keys()].sort((a, b) => a - b);
        const firstPageItems = itemsByPage.get(sortedPages[0]) ?? [];

        const headerMetadata = this.extractHeaderMetadata(firstPageItems);
        const headerRow = this.detectHeaderRow(firstPageItems);

        let effectiveColumns = columns;
        let colIndices: SpatialColumnMap = { time: 0, date: 1, narration: 2, debit: 3, credit: 4, balance: 5 };

        if (headerRow) {
            effectiveColumns = this.matchColumnsToHeaders(headerRow, columns);
            colIndices = this.mapHeaderTypesToIndices(headerRow, effectiveColumns, firstPageItems);
        }

        for (const pageNum of sortedPages) {
            const pageItems = itemsByPage.get(pageNum)!;
            const rows = groupIntoRows(pageItems);

            const pageTransactions = rows
                .map(row => this.mapSpatialRowToTransaction(row, effectiveColumns, colIndices))
                .filter((t): t is Transaction => t !== null);

            transactions.push(...pageTransactions);
        }

        const normalizedTransactions = this.mergePairedTransactions(transactions);
        const accounts = this.categorizeTransactions(normalizedTransactions);

        return {
            success: normalizedTransactions.length > 0,
            transactions: normalizedTransactions,
            errors: [],
            summary: this.generateSummary(normalizedTransactions),
            metadata: { bankName: 'Opay', ...headerMetadata } satisfies StatementMetadata,
            accounts,
        };
    }

    private mapSpatialRowToTransaction(
        row: TextItem[],
        columns: number[],
        colMap: SpatialColumnMap,
    ): Transaction | null {
        const cells = assignItemsToColumns(row, columns);

        const rowText = row.map(i => i.text).join(' ');
        if (/trans\.?\s*time|value\s*date|description|debit|credit|balance/i.test(rowText)) {
            return null;
        }

        // Aggregate narration cells spanning from narration column up to (but not including) debit/credit
        const narrationCells: TextItem[] = [];
        for (let i = colMap.narration; i < Math.min(colMap.debit, colMap.credit); i++) {
            if (cells[i]) narrationCells.push(...cells[i]);
        }

        const transTimeStr = cells[colMap.time]?.map(i => i.text).join(' ').trim() ?? '';
        const descriptionStr = narrationCells.map(i => i.text).join(' ').trim();
        const debitStr = cells[colMap.debit]?.map(i => i.text).join('').trim() ?? '--';
        const creditStr = cells[colMap.credit]?.map(i => i.text).join('').trim() ?? '--';
        const balanceStr = cells[colMap.balance]?.map(i => i.text).join('').trim() ?? '0';

        if (!transTimeStr || !/\d{2}:\d{2}:\d{2}/.test(transTimeStr)) return null;

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
            narration: descriptionStr || 'No description',
            type,
            balance,
            source: 'Opay PDF (Spatial)',
        };
    }

    private mergePairedTransactions(transactions: Transaction[]): Transaction[] {
        // OWealth withdrawals are funding mechanics, not independent user actions.
        // When a debit is immediately followed by its OWealth funding credit, keep only the debit.
        const merged: Transaction[] = [];
        let i = 0;

        while (i < transactions.length) {
            const current = transactions[i];
            const next = transactions[i + 1];

            const isFundingPair =
                next &&
                Math.abs(new Date(current.date).getTime() - new Date(next.date).getTime()) < 5000 &&
                current.type === 'debit' && current.amount > 0 &&
                next.type === 'credit' && next.amount > 0 &&
                /owealth withdrawal/i.test(next.narration);

            if (isFundingPair) {
                merged.push({ ...current, balance: next.balance ?? current.balance });
                i += 2;
            } else {
                merged.push(current);
                i += 1;
            }
        }

        return merged;
    }

    private categorizeTransactions(transactions: Transaction[]) {
        const walletTransactions: Transaction[] = [];
        const savingsTransactions: Transaction[] = [];

        transactions.forEach(t => {
            const nar = t.narration.toLowerCase();
            const isOWealth = nar.includes('owealth');

            if (!isOWealth) {
                walletTransactions.push(t);
                return;
            }

            const isTransactionPayment = nar.includes('(transaction payment)');

            // OWealth funding a wallet payment → wallet activity
            if (isTransactionPayment && t.type === 'credit') {
                walletTransactions.push(t);
                return;
            }

            // Wallet transfer into OWealth (debit, not a withdrawal) → wallet outflow
            if (t.type === 'debit' && !nar.includes('withdrawal')) {
                walletTransactions.push(t);
                return;
            }

            // Everything else OWealth-related (interest, withdrawals, deposits) → savings
            savingsTransactions.push(t);
        });

        return [
            { accountName: 'Wallet Account', transactions: walletTransactions, summary: this.generateSummary(walletTransactions) },
            { accountName: 'Savings', transactions: savingsTransactions, summary: this.generateSummary(savingsTransactions) },
        ];
    }

    private extractHeaderMetadata(items: TextItem[]): Omit<StatementMetadata, 'bankName'> {
        const metadata: Omit<StatementMetadata, 'bankName'> = {};
        const sorted = [...items].sort((a, b) => b.y - a.y);
        const rows = groupIntoRows(sorted, 15);

        rows.forEach(row => {
            const rowText = row.map(i => i.text).join(' ');
            const numbers = rowText.match(/([\d,]+\.\d{2}|0\.00)/g);
            if (!numbers || numbers.length < 2) return;

            const val1 = this.parseAmount(numbers[0]);
            const val2 = this.parseAmount(numbers[1]);

            if (/Opening\s*Balance/.test(rowText) && /Total\s*Debit/.test(rowText)) {
                if (val1) metadata.totalDebitAmount = val1;
                if (val2 !== null) metadata.openingBalance = val2;
            }

            if (/Closing\s*Balance/.test(rowText) && /Total\s*Credit/.test(rowText)) {
                if (val1) metadata.totalCreditAmount = val1;
                if (val2 !== null) metadata.closingBalance = val2;
            }
        });

        return metadata;
    }

    private parseWithRegex(text: string): ParseResult {
        const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        const transactions: Transaction[] = [];
        const errors: string[] = [];
        const transactionBlocks: string[] = [];
        let currentBlock: string[] = [];
        const dateStartRegex = /^\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}/;

        for (const line of lines) {
            if (dateStartRegex.test(line)) {
                if (currentBlock.length > 0) transactionBlocks.push(currentBlock.join(' '));
                currentBlock = [line];
            } else if (currentBlock.length > 0) {
                currentBlock.push(line);
            }
        }
        if (currentBlock.length > 0) transactionBlocks.push(currentBlock.join(' '));

        const blockRegex = /^(\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2})\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+?)\s+((?:--|[\d,]+\.\d{2}))\s+((?:--|[\d,]+\.\d{2}))\s+((?:--|[\d,]+\.\d{2}))\s+(\w+)\s+([A-Za-z0-9]+)(.*)$/;

        for (const block of transactionBlocks) {
            const match = block.match(blockRegex);
            if (!match) continue;

            try {
                const [, transTimeStr, , descriptionPart1, debitStr, creditStr, balanceStr, , , trailingText] = match;

                const date = this.parseDate(transTimeStr);
                if (!date) continue;

                const debit = debitStr === '--' ? 0 : this.parseAmount(debitStr);
                const credit = creditStr === '--' ? 0 : this.parseAmount(creditStr);
                const balance = this.parseAmount(balanceStr);
                const fullDescription = (descriptionPart1 + (trailingText ?? '')).trim();

                if (debit === 0 && credit === 0) continue;

                const amount = debit > 0 ? debit : credit;
                const type: 'debit' | 'credit' = debit > 0 ? 'debit' : 'credit';

                transactions.push({
                    date: date.toISOString(),
                    amount,
                    narration: fullDescription,
                    type,
                    balance,
                    source: 'Opay PDF',
                });
            } catch {
                errors.push(`Error parsing block: "${block.substring(0, 30)}..."`);
            }
        }

        const walletTransactions: Transaction[] = [];
        const owealthTransactions: Transaction[] = [];
        transactions.forEach(t => {
            const nar = t.narration.toLowerCase();
            if (nar.includes('owealth') || nar.includes('auto-save')) owealthTransactions.push(t);
            else walletTransactions.push(t);
        });

        return {
            success: transactions.length > 0,
            transactions,
            errors,
            summary: this.generateSummary(transactions),
            metadata: { bankName: 'Opay' } satisfies StatementMetadata,
            accounts: [
                { accountName: 'Wallet Account', transactions: walletTransactions, summary: this.generateSummary(walletTransactions) },
                { accountName: 'OWealth Account', transactions: owealthTransactions, summary: this.generateSummary(owealthTransactions) },
            ],
        };
    }

    protected detectColumns(headers: string[]): ColumnMapping {
        const map = super.detectColumns(headers);
        if (map.date === undefined && headers.length >= 5) {
            return { date: 0, narration: 2, debit: 3, credit: 4, balance: 5 };
        }
        return map;
    }

    private detectHeaderRow(items: TextItem[]): TextItem[] | null {
        const sorted = [...items].sort((a, b) => b.y - a.y);
        const rows = groupIntoRows(sorted, 10);

        const requiredPatterns = [
            /Trans\.?\s*Time/i,
            /Description/i,
            /Debit/i,
            /Credit/i,
            /Balance/i,
        ];

        for (const row of rows) {
            const rowText = row.map(i => i.text).join(' ');
            const matches = requiredPatterns.filter(p => p.test(rowText)).length;
            if (matches >= 3) return row.sort((a, b) => a.x - b.x);
        }

        return null;
    }

    private matchColumnsToHeaders(headerRow: TextItem[], allClusters: number[]): number[] {
        const headerDefs: { type: string; x: number }[] = [];

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

        const resultColumns: number[] = [];
        headerDefs.sort((a, b) => a.x - b.x).forEach(h => {
            const bestCluster = allClusters.reduce((closest, curr) =>
                Math.abs(curr - h.x) < Math.abs(closest - h.x) ? curr : closest,
                allClusters[0]
            );

            resultColumns.push(Math.abs(bestCluster - h.x) < 100 ? bestCluster : h.x);
        });

        return resultColumns.sort((a, b) => a - b);
    }

    private mapHeaderTypesToIndices(
        headerRow: TextItem[],
        refinedClusters: number[],
        allItems: TextItem[],
    ): SpatialColumnMap {
        const map: SpatialColumnMap = { time: 0, date: 1, narration: 2, debit: 3, credit: 4, balance: 5 };

        // Use each item's own pageHeight for relative density filtering
        const clusterDensity = refinedClusters.map(cX =>
            allItems.filter(i => {
                const topMargin = i.pageHeight * 0.90;
                const bottomMargin = i.pageHeight * 0.05;
                return Math.abs(i.x - cX) < 10 && i.y > bottomMargin && i.y < topMargin;
            }).length
        );

        headerRow.forEach(item => {
            const t = item.text.toLowerCase();

            let closestIdx = -1;
            let minDistance = Infinity;

            refinedClusters.forEach((clusterX, idx) => {
                const dist = Math.abs(clusterX - item.x);
                // Penalise low-density clusters (likely spacers, not data columns)
                const adjustedDist = clusterDensity[idx] > 5 ? dist : dist + 20;

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
