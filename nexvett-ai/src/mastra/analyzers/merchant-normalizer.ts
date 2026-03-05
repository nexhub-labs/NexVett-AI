import { BaseProcessorImpl } from './base-processor';
import { AnalysisContext, ProcessorResult, Transaction } from '../types/transaction';

export interface NormalizedTransaction extends Transaction {
    merchantName: string;
    merchantCategory?: string;
    isKnownMerchant: boolean;
}

export interface MerchantNormalizationResult {
    transactions: NormalizedTransaction[];
    merchantSummary: {
        merchant: string;
        count: number;
        totalSpent: number;
        category?: string;
    }[];
}

/**
 * Merchant Normalizer Processor
 */
export class MerchantNormalizer extends BaseProcessorImpl {
    readonly name = 'merchant-normalizer';

    private readonly merchantMappings = [
        { normalized: 'Uber', patterns: ['UBER'], category: 'transport' },
        { normalized: 'Bolt', patterns: ['BOLT', 'TAXIFY'], category: 'transport' },
        { normalized: 'Shoprite', patterns: ['SHOPRITE'], category: 'shopping' },
        { normalized: 'Jumia', patterns: ['JUMIA'], category: 'shopping' },
        { normalized: 'MTN', patterns: ['MTN', 'MTNN'], category: 'utilities' },
        { normalized: 'Airtel', patterns: ['AIRTEL'], category: 'utilities' },
        { normalized: 'Netflix', patterns: ['NETFLIX'], category: 'entertainment' },
        { normalized: 'DStv', patterns: ['DSTV', 'MULTICHOICE'], category: 'utilities' },
        { normalized: 'Paystack', patterns: ['PAYSTACK', 'PYSTK'], category: 'payment' },
        { normalized: 'Flutterwave', patterns: ['FLUTTERWAVE', 'FLW'], category: 'payment' },
        { normalized: 'PiggyVest', patterns: ['PIGGYVEST', 'PIGGY'], category: 'savings' },
        { normalized: 'Opay', patterns: ['OPAY'], category: 'payment' },
        { normalized: 'Kuda', patterns: ['KUDA'], category: 'payment' },
        { normalized: 'Bet9ja', patterns: ['BET9JA'], category: 'entertainment' },
    ];

    async process(context: AnalysisContext): Promise<ProcessorResult> {
        try {
            const transactions = this.getTransactions(context);
            if (transactions.length === 0) {
                return this.success({ transactions: [], merchantSummary: [] }, [], 0);
            }

            const normalizedTransactions: NormalizedTransaction[] = transactions.map(tx =>
                this.normalizeTransaction(tx)
            );

            const merchantSummary = this.calculateMerchantSummary(normalizedTransactions);

            return this.success({ transactions: normalizedTransactions, merchantSummary }, transactions, transactions.length);
        } catch (error) {
            return this.failure(`Merchant normalization failed: ${error instanceof Error ? error.message : String(error)}`, context.transactions);
        }
    }

    private normalizeTransaction(tx: Transaction): NormalizedTransaction {
        const narration = (tx.narration || '').toUpperCase();

        for (const mapping of this.merchantMappings) {
            for (const pattern of mapping.patterns) {
                if (narration.includes(pattern)) {
                    return { ...tx, merchantName: mapping.normalized, merchantCategory: mapping.category, isKnownMerchant: true };
                }
            }
        }

        const extractedMerchant = this.extractMerchantFromNarration(narration);
        return { ...tx, merchantName: extractedMerchant || 'Unknown', isKnownMerchant: false };
    }

    private extractMerchantFromNarration(narration: string): string | null {
        let cleaned = narration
            .replace(/^(POS|ATM|WEB|NIP|TRF|TRANSFER|USSD)\s*/i, '')
            .replace(/\s+\d{6,}$/, '')
            .trim();

        if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
            return cleaned.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        return null;
    }

    private calculateMerchantSummary(transactions: NormalizedTransaction[]) {
        const merchantMap = new Map<string, { count: number; totalSpent: number; category?: string }>();
        const spendingTx = transactions.filter(tx => tx.type === 'debit');

        for (const tx of spendingTx) {
            const existing = merchantMap.get(tx.merchantName) || { count: 0, totalSpent: 0 };
            merchantMap.set(tx.merchantName, {
                count: existing.count + 1,
                totalSpent: existing.totalSpent + Math.abs(tx.amount),
                category: tx.merchantCategory
            });
        }

        return Array.from(merchantMap.entries())
            .map(([merchant, data]) => ({ merchant, ...data }))
            .sort((a, b) => b.totalSpent - a.totalSpent);
    }
}

export const merchantNormalizer = new MerchantNormalizer();
