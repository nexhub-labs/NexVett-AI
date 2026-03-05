import { BaseProcessorImpl } from './base-processor';
import { AnalysisContext, ProcessorResult, Transaction } from '../types/transaction';

/**
 * Category definitions for Nigerian banking transactions
 */
export interface CategoryRule {
    category: string;
    subCategory?: string;
    keywords: string[];
    priority: number; // Higher priority rules are checked first
}

export interface CategorizedTransaction extends Transaction {
    normalizedCategory: string;
    subCategory?: string;
    categoryConfidence: number;
}

export interface CategorizationResult {
    transactions: CategorizedTransaction[];
    categorySummary: {
        category: string;
        count: number;
        totalAmount: number;
        percentage: number;
    }[];
}

/**
 * Categorization Processor
 * Categorizes transactions based on Nigerian banking patterns
 */
export class CategorizationProcessor extends BaseProcessorImpl {
    readonly name = 'categorization';

    // Nigerian banking category rules
    private readonly categoryRules: CategoryRule[] = [
        // Transfer categories - BROAD patterns to catch most transfers
        { category: 'transfers', subCategory: 'nip-transfer', keywords: ['NIP', 'NIBSS', 'INTERBANK', 'NIP/', 'NIP-'], priority: 10 },
        { category: 'transfers', subCategory: 'mobile-transfer', keywords: ['MB-NIP', 'MOBILE BANKING', 'APP TRANSFER', 'MOBILE TRF'], priority: 10 },
        { category: 'transfers', subCategory: 'ussd-transfer', keywords: ['737', '919', '901', 'USSD', '*737*', '*901*', '*919*'], priority: 10 },
        { category: 'transfers', subCategory: 'opay-transfer', keywords: ['OPAY', 'OPay', 'OPAYTRF', 'OPAY TRANSFER', 'TO OPAY', 'FROM OPAY'], priority: 10 },
        { category: 'transfers', subCategory: 'palmpay-transfer', keywords: ['PALMPAY', 'PALM PAY', 'PALMPAYTRF'], priority: 10 },
        { category: 'transfers', subCategory: 'kuda-transfer', keywords: ['KUDA', 'KUDATRF'], priority: 10 },
        { category: 'transfers', subCategory: 'bank-transfer', keywords: ['TRF FROM', 'TRF TO', 'TRANSFER', 'TRF', 'FT', 'SENT TO', 'RECEIVED FROM', 'INWARD', 'OUTWARD'], priority: 5 },

        // POS/Card categories - expanded
        { category: 'pos', subCategory: 'pos-purchase', keywords: ['POS PURCHASE', 'POS CHRG', 'POS/', 'POS ', 'MERCHANT', 'PAYMENT TO', 'PAY TO'], priority: 10 },
        { category: 'pos', subCategory: 'web-payment', keywords: ['WEB PURCHASE', 'ONLINE PAYMENT', 'ECOMMERCE', 'WEB PAY', 'PAYSTACK', 'FLUTTERWAVE', 'RAVEPAY'], priority: 10 },
        { category: 'card', subCategory: 'atm', keywords: ['ATM', 'ATM WDL', 'ATM WITHDRAWAL', 'CASH WITHDRAWAL', 'WITHDRAWAL', 'WDL'], priority: 10 },
        { category: 'card', subCategory: 'card-payment', keywords: ['CARD PAYMENT', 'DEBIT CARD', 'VISA', 'MASTERCARD', 'VERVE', 'CARD TXN'], priority: 8 },

        // Fees and charges - comprehensive
        { category: 'fees', subCategory: 'sms-alert', keywords: ['SMS ALERT', 'SMS CHARGE', 'SMS FEE', 'ALERT CHARGE', 'SMS NOTIFICATION', 'ALERT FEE'], priority: 10 },
        { category: 'fees', subCategory: 'maintenance', keywords: ['MAINTENANCE', 'ACCT MAINT', 'ACCOUNT MAINTENANCE', 'A/C MAINT'], priority: 10 },
        { category: 'fees', subCategory: 'stamp-duty', keywords: ['STAMP DUTY', 'STAMP CHARGE', 'STD', 'STAMP DUTIES'], priority: 10 },
        { category: 'fees', subCategory: 'levy', keywords: ['ELT LEVY', 'ELECTRONIC LEVY', 'EDUCATION TAX', 'E-LEVY'], priority: 10 },
        { category: 'fees', subCategory: 'transfer-fee', keywords: ['TRANSFER FEE', 'TRF FEE', 'NIP FEE', 'TRANSACTION FEE', 'TXN FEE', 'CHARGE'], priority: 10 },
        { category: 'fees', subCategory: 'card-fee', keywords: ['CARD FEE', 'CARD MAINTENANCE', 'CARD ISSUANCE'], priority: 10 },
        { category: 'fees', subCategory: 'vat', keywords: ['VAT', 'VALUE ADDED TAX', 'TAX CHARGE'], priority: 10 },
        { category: 'fees', subCategory: 'cot', keywords: ['COT', 'COMMISSION ON TURNOVER'], priority: 10 },
        { category: 'fees', subCategory: 'loan-fee', keywords: ['LOAN FEE', 'LOAN CHARGE', 'MANAGEMENT FEE', 'PROCESSING FEE'], priority: 10 },
        { category: 'fees', subCategory: 'service-charge', keywords: ['SERVICE CHARGE', 'ADMIN FEE', 'PROCESSING FEE'], priority: 8 },

        // Income categories
        { category: 'income', subCategory: 'salary', keywords: ['SALARY', 'WAGES', 'PAY', 'REMUNERATION', 'ALLOWANCE'], priority: 10 },
        { category: 'income', subCategory: 'dividend', keywords: ['DIVIDEND', 'INTEREST', 'BONUS', 'INT PAID'], priority: 8 },
        { category: 'income', subCategory: 'refund', keywords: ['REFUND', 'REVERSAL', 'CHARGEBACK', 'CASHBACK', 'REWARD'], priority: 8 },

        // Utilities - comprehensive Nigerian patterns
        { category: 'utilities', subCategory: 'airtime', keywords: ['AIRTIME', 'MTN', 'GLO', 'AIRTEL', '9MOBILE', 'ETISALAT', 'VTU', 'RECHARGE', 'TOP UP', 'TOPUP'], priority: 10 },
        { category: 'utilities', subCategory: 'data', keywords: ['DATA', 'DATA BUNDLE', 'DATA SUB', 'DATA PURCHASE', 'GB DATA', 'MB DATA'], priority: 8 },
        { category: 'utilities', subCategory: 'electricity', keywords: ['ELECTRIC', 'EKEDC', 'IKEDC', 'AEDC', 'PHCN', 'PREPAID METER', 'TOKEN', 'NEPA', 'DISCO', 'POWER'], priority: 10 },
        { category: 'utilities', subCategory: 'cable', keywords: ['DSTV', 'GOTV', 'STARTIMES', 'CABLE TV', 'SUBSCRIPTION', 'MULTICHOICE'], priority: 10 },
        { category: 'utilities', subCategory: 'internet', keywords: ['INTERNET', 'SPECTRANET', 'SMILE', 'ISP', 'BROADBAND', 'WIFI'], priority: 8 },
        { category: 'utilities', subCategory: 'bills', keywords: ['BILL', 'BILLS PAYMENT', 'UTILITY', 'WATER BILL'], priority: 5 },

        // Transport - Nigerian ride-hailing and fuel
        { category: 'transport', subCategory: 'ride-hailing', keywords: ['UBER', 'BOLT', 'INDRIVE', 'TAXIFY', 'RIDE', 'CAB', 'TAXI'], priority: 10 },
        { category: 'transport', subCategory: 'fuel', keywords: ['FUEL', 'PETROL', 'FILLING STATION', 'OANDO', 'TOTAL', 'MOBIL', 'NNPC', 'GAS STATION', 'DIESEL', 'PMS'], priority: 10 },

        // Food & Dining - Nigerian patterns
        { category: 'food', subCategory: 'restaurant', keywords: ['RESTAURANT', 'EATERY', 'PIZZA', 'CHICKEN REPUBLIC', 'KFC', 'DOMINOS', 'BUKKA', 'SUYA', 'FOOD'], priority: 10 },
        { category: 'food', subCategory: 'grocery', keywords: ['SHOPRITE', 'SPAR', 'MARKET', 'GROCERY', 'SUPERMARKET', 'JUSTRITE', 'HUBMART'], priority: 8 },
        { category: 'food', subCategory: 'delivery', keywords: ['JUMIA FOOD', 'CHOWDECK', 'GLOVO', 'FOOD DELIVERY'], priority: 10 },

        // Shopping - Nigerian ecommerce
        { category: 'shopping', subCategory: 'online', keywords: ['JUMIA', 'KONGA', 'AMAZON', 'ALIEXPRESS', 'EBAY', 'PURCHASE'], priority: 10 },
        { category: 'shopping', subCategory: 'fashion', keywords: ['FASHION', 'CLOTHING', 'SHOES', 'ACCESSORY'], priority: 5 },

        // Entertainment
        { category: 'entertainment', subCategory: 'streaming', keywords: ['NETFLIX', 'SHOWMAX', 'SPOTIFY', 'YOUTUBE', 'PRIME VIDEO', 'APPLE MUSIC'], priority: 10 },
        { category: 'entertainment', subCategory: 'gaming', keywords: ['GAME', 'GAMING', 'PLAYSTATION', 'XBOX', 'STEAM', 'PUBG', 'COD'], priority: 8 },
        { category: 'entertainment', subCategory: 'betting', keywords: ['BET', 'SPORTY', 'BET9JA', 'BETWAY', 'BETKING', 'NAIRABET', 'SPORTPESA', '1XBET', 'MERRYBET'], priority: 10 },

        // Health
        { category: 'health', subCategory: 'pharmacy', keywords: ['PHARMACY', 'DRUG', 'MEDICINE', 'MEDPLUS', 'HEALTHPLUS'], priority: 8 },
        { category: 'health', subCategory: 'hospital', keywords: ['HOSPITAL', 'CLINIC', 'MEDICAL', 'HEALTH', 'DOCTOR'], priority: 5 },

        // Education
        { category: 'education', subCategory: 'school-fees', keywords: ['SCHOOL', 'TUITION', 'ACADEMY', 'UNIVERSITY', 'COLLEGE', 'POLY'], priority: 8 },
        { category: 'education', subCategory: 'courses', keywords: ['COURSE', 'TRAINING', 'UDEMY', 'COURSERA', 'CLASS'], priority: 5 },

        // Insurance & Savings
        { category: 'savings', subCategory: 'investment', keywords: ['PIGGYVEST', 'COWRYWISE', 'RISEVEST', 'BAMBOO', 'INVESTMENT', 'KOLO', 'SAVE'], priority: 10 },
        { category: 'insurance', subCategory: 'insurance', keywords: ['INSURANCE', 'POLICY', 'PREMIUM', 'LEADWAY', 'AIICO'], priority: 8 },

        // Loan
        { category: 'loan', subCategory: 'loan-disbursement', keywords: ['LOAN DISBURSEMENT', 'FAIRMONEY', 'CARBON', 'BRANCH', 'PALMCREDIT', 'QUICKCHECK', 'RENMONEY'], priority: 8 },
        { category: 'loan', subCategory: 'loan-repayment', keywords: ['REPAYMENT', 'LOAN PAYMENT', 'INSTALMENT'], priority: 8 },

        // Catch-all patterns for common transaction types - LOW priority
        { category: 'transfers', subCategory: 'general', keywords: ['TO:', 'FROM:', '->'], priority: 2 },
    ];

    async process(context: AnalysisContext): Promise<ProcessorResult> {
        try {
            const transactions = this.getTransactions(context);

            if (transactions.length === 0) {
                return this.success({ transactions: [], categorySummary: [] }, [], 0);
            }

            // Categorize each transaction
            const categorizedTransactions: CategorizedTransaction[] = transactions.map(tx =>
                this.categorizeTransaction(tx)
            );

            // Calculate category summary
            const categorySummary = this.calculateCategorySummary(categorizedTransactions);

            const result: CategorizationResult = {
                transactions: categorizedTransactions,
                categorySummary
            };

            return this.success(result, transactions, transactions.length);
        } catch (error) {
            return this.failure(`Categorization failed: ${error instanceof Error ? error.message : String(error)}`, context.transactions);
        }
    }

    private categorizeTransaction(tx: Transaction): CategorizedTransaction {
        const narration = (tx.narration || '').toUpperCase();

        // Sort rules by priority (highest first)
        const sortedRules = [...this.categoryRules].sort((a, b) => b.priority - a.priority);

        for (const rule of sortedRules) {
            for (const keyword of rule.keywords) {
                if (narration.includes(keyword.toUpperCase())) {
                    return {
                        ...tx,
                        normalizedCategory: rule.category,
                        subCategory: rule.subCategory,
                        categoryConfidence: rule.priority / 10
                    };
                }
            }
        }

        // Default category based on transaction type
        const defaultCategory = tx.type === 'credit' ? 'income' : 'uncategorized';

        return {
            ...tx,
            normalizedCategory: defaultCategory,
            subCategory: undefined,
            categoryConfidence: 0.1
        };
    }

    private calculateCategorySummary(transactions: CategorizedTransaction[]): CategorizationResult['categorySummary'] {
        // IMPORTANT: Only include DEBIT transactions (expenses) for spending category summary
        // Income (credits) should NOT appear in "Spending by Category"
        const expenseTransactions = transactions.filter(tx => tx.type === 'debit');

        const categoryMap = new Map<string, { count: number; totalAmount: number }>();

        for (const tx of expenseTransactions) {
            const existing = categoryMap.get(tx.normalizedCategory) || { count: 0, totalAmount: 0 };
            categoryMap.set(tx.normalizedCategory, {
                count: existing.count + 1,
                totalAmount: existing.totalAmount + Math.abs(tx.amount)
            });
        }

        const totalSpent = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        return Array.from(categoryMap.entries())
            .map(([category, data]) => ({
                category,
                count: data.count,
                totalAmount: data.totalAmount,
                percentage: totalSpent > 0 ? (data.totalAmount / totalSpent) * 100 : 0
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount);
    }
}

export const categorizationProcessor = new CategorizationProcessor();
