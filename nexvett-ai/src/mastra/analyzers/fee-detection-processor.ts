import { BaseProcessorImpl } from './base-processor';
import { AnalysisContext, ProcessorResult, Transaction } from '../types/transaction';

/**
 * Fee detection patterns and types
 */
export interface FeePattern {
    name: string;
    keywords: string[];
    description: string;
    isHidden: boolean; // Fees that are often overlooked
    averageAmount?: number; // Expected range for validation
}

export interface DetectedFee extends Transaction {
    feeType: string;
    feeDescription: string;
    isHidden: boolean;
}

export interface FeeDetectionResult {
    fees: DetectedFee[];
    feeAudit: {
        totalFees: number;
        totalHiddenFees: number;
        feeCount: number;
        hiddenFeeCount: number;
        feeBreakdown: {
            type: string;
            count: number;
            totalAmount: number;
            description: string;
            isHidden: boolean;
        }[];
    };
    recommendations: string[];
}

/**
 * Fee Detection Processor
 * Identifies bank fees, charges, and hidden costs in Nigerian banking
 */
export class FeeDetectionProcessor extends BaseProcessorImpl {
    readonly name = 'fee-detection';

    private readonly feePatterns: FeePattern[] = [
        // SMS & Notification Fees
        {
            name: 'sms-alert',
            keywords: ['SMS ALERT', 'SMS CHARGE', 'SMS FEE', 'ALERT CHARGE', 'SMS NOTIFICATION', 'E-ALERT'],
            description: 'SMS Alert & Notification Fees',
            isHidden: true,
            averageAmount: 50
        },

        // Account Maintenance
        {
            name: 'account-maintenance',
            keywords: ['MAINTENANCE', 'ACCOUNT MAINTENANCE', 'ACCT MAINT', 'A/C MAINT', 'MONTHLY CHARGE', 'ACCOUNT FEE'],
            description: 'Account Maintenance Fees',
            isHidden: false,
            averageAmount: 100
        },

        // Stamp Duty
        {
            name: 'stamp-duty',
            keywords: ['STAMP DUTY', 'STAMP CHARGE', 'SD CHARGE', 'STAMP'],
            description: 'Government Stamp Duty',
            isHidden: true,
            averageAmount: 50
        },

        // Electronic Transfer Levy
        {
            name: 'elt-levy',
            keywords: ['ELT LEVY', 'ELECTRONIC LEVY', 'E-LEVY', 'ELECTRONIC TRF LEVY', 'ELECTRONIC TRANSFER LEVY'],
            description: 'Electronic Transfer Levy',
            isHidden: true
        },

        // VAT Charges
        {
            name: 'vat',
            keywords: ['VAT', 'VALUE ADDED TAX', 'VAT CHARGE', 'VAT ON'],
            description: 'Value Added Tax',
            isHidden: true
        },

        // Commission on Turnover
        {
            name: 'cot',
            keywords: ['COT', 'COMMISSION ON TURNOVER', 'COT CHARGE'],
            description: 'Commission on Turnover',
            isHidden: true
        },

        // Transfer Fees
        {
            name: 'transfer-fee',
            keywords: ['TRANSFER FEE', 'TRF FEE', 'NIP FEE', 'NIP CHARGE', 'TRANSACTION FEE', 'TRANS FEE'],
            description: 'Transfer & Transaction Fees',
            isHidden: false
        },

        // ATM Fees
        {
            name: 'atm-fee',
            keywords: ['ATM FEE', 'ATM CHARGE', 'ATM SERVICE', 'ATM MAINTENANCE', 'EXCESS WITHDRAWAL'],
            description: 'ATM Fees & Charges',
            isHidden: false
        },

        // Card Fees
        {
            name: 'card-fee',
            keywords: ['CARD FEE', 'CARD MAINTENANCE', 'CARD ISSUANCE', 'CARD CHARGE', 'DEBIT CARD FEE', 'CARD RENEWAL'],
            description: 'Card Fees & Maintenance',
            isHidden: false
        },

        // POS Charges
        {
            name: 'pos-fee',
            keywords: ['POS FEE', 'POS CHARGE', 'POS-CHRG', 'MERCHANT FEE'],
            description: 'POS Transaction Charges',
            isHidden: true
        },

        // Service Charges
        {
            name: 'service-charge',
            keywords: ['SERVICE CHARGE', 'SERVICE FEE', 'ADMIN FEE', 'ADMINISTRATION FEE', 'PROCESSING FEE'],
            description: 'Service & Admin Charges',
            isHidden: false
        },

        // Cheque Book Fees
        {
            name: 'cheque-fee',
            keywords: ['CHEQUE BOOK', 'CHQ BOOK', 'CHEQUE FEE', 'CHEQUE LEAF'],
            description: 'Cheque Book Fees',
            isHidden: false
        },

        // Statement Fees
        {
            name: 'statement-fee',
            keywords: ['STATEMENT FEE', 'STATEMENT CHARGE', 'STATEMENT REQUEST', 'REFERENCE LETTER'],
            description: 'Statement & Reference Fees',
            isHidden: false
        },

        // Overdraft Fees
        {
            name: 'overdraft-fee',
            keywords: ['OVERDRAFT', 'OD FEE', 'OD CHARGE', 'OD INTEREST', 'EXCESS'],
            description: 'Overdraft Fees & Interest',
            isHidden: false
        },

        // Standing Order Fees
        {
            name: 'standing-order-fee',
            keywords: ['STANDING ORDER', 'SO FEE', 'DIRECT DEBIT FEE'],
            description: 'Standing Order & Direct Debit Fees',
            isHidden: false
        },

        // Failed Transaction Fees
        {
            name: 'failed-transaction-fee',
            keywords: ['FAILED TRANSACTION', 'FAILED TRF', 'REVERSAL FEE', 'BOUNCE FEE'],
            description: 'Failed Transaction Fees',
            isHidden: true
        },

        // Loan Fees
        {
            name: 'loan-fee',
            keywords: ['LOAN FEE', 'CREDIT FEE', 'DISBURSEMENT FEE', 'LOAN PROCESSING', 'INSURANCE FEE'],
            description: 'Loan Processing & Insurance Fees',
            isHidden: false
        }
    ];

    async process(context: AnalysisContext): Promise<ProcessorResult> {
        try {
            const transactions = this.getTransactions(context);

            if (transactions.length === 0) {
                return this.success({
                    fees: [],
                    feeAudit: {
                        totalFees: 0,
                        totalHiddenFees: 0,
                        feeCount: 0,
                        hiddenFeeCount: 0,
                        feeBreakdown: []
                    },
                    recommendations: []
                }, [], 0);
            }

            // Detect fees in transactions
            const detectedFees = this.detectFees(transactions);

            // Calculate fee audit
            const feeAudit = this.calculateFeeAudit(detectedFees);

            // Generate recommendations
            const recommendations = this.generateRecommendations(feeAudit);

            const result: FeeDetectionResult = {
                fees: detectedFees,
                feeAudit,
                recommendations
            };

            return this.success(result, transactions, transactions.length);
        } catch (error) {
            return this.failure(`Fee detection failed: ${error instanceof Error ? error.message : String(error)}`, context.transactions);
        }
    }

    private detectFees(transactions: Transaction[]): DetectedFee[] {
        const fees: DetectedFee[] = [];

        for (const tx of transactions) {
            // Only check debit transactions for fees
            if (tx.type !== 'debit') continue;

            const narration = (tx.narration || '').toUpperCase();

            for (const pattern of this.feePatterns) {
                const isMatch = pattern.keywords.some(keyword =>
                    narration.includes(keyword.toUpperCase())
                );

                if (isMatch) {
                    fees.push({
                        ...tx,
                        feeType: pattern.name,
                        feeDescription: pattern.description,
                        isHidden: pattern.isHidden
                    });
                    break; // Only match first pattern
                }
            }
        }

        return fees;
    }

    private calculateFeeAudit(fees: DetectedFee[]): FeeDetectionResult['feeAudit'] {
        const feeBreakdownMap = new Map<string, {
            count: number;
            totalAmount: number;
            description: string;
            isHidden: boolean;
        }>();

        for (const fee of fees) {
            const existing = feeBreakdownMap.get(fee.feeType) || {
                count: 0,
                totalAmount: 0,
                description: fee.feeDescription,
                isHidden: fee.isHidden
            };

            feeBreakdownMap.set(fee.feeType, {
                count: existing.count + 1,
                totalAmount: existing.totalAmount + Math.abs(fee.amount),
                description: fee.feeDescription,
                isHidden: fee.isHidden
            });
        }

        const feeBreakdown = Array.from(feeBreakdownMap.entries()).map(([type, data]) => ({
            type,
            ...data
        })).sort((a, b) => b.totalAmount - a.totalAmount);

        const totalFees = fees.reduce((sum, fee) => sum + Math.abs(fee.amount), 0);
        const hiddenFees = fees.filter(fee => fee.isHidden);
        const totalHiddenFees = hiddenFees.reduce((sum, fee) => sum + Math.abs(fee.amount), 0);

        return {
            totalFees,
            totalHiddenFees,
            feeCount: fees.length,
            hiddenFeeCount: hiddenFees.length,
            feeBreakdown
        };
    }

    private generateRecommendations(feeAudit: FeeDetectionResult['feeAudit']): string[] {
        const recommendations: string[] = [];

        // Check SMS Alert fees
        const smsBreakdown = feeAudit.feeBreakdown.find(f => f.type === 'sms-alert');
        if (smsBreakdown && smsBreakdown.count > 10) {
            recommendations.push(
                `You've been charged ₦${smsBreakdown.totalAmount.toFixed(2)} in SMS alert fees. Consider switching to email-only notifications or a bank with free SMS alerts.`
            );
        }

        // Check maintenance fees
        const maintBreakdown = feeAudit.feeBreakdown.find(f => f.type === 'account-maintenance');
        if (maintBreakdown && maintBreakdown.totalAmount > 500) {
            recommendations.push(
                `Account maintenance fees totaling ₦${maintBreakdown.totalAmount.toFixed(2)} were charged. Consider accounts with lower or no maintenance fees.`
            );
        }

        // Check transfer fees
        const transferBreakdown = feeAudit.feeBreakdown.find(f => f.type === 'transfer-fee');
        if (transferBreakdown && transferBreakdown.count > 20) {
            recommendations.push(
                `You made ${transferBreakdown.count} transfers with fees totaling ₦${transferBreakdown.totalAmount.toFixed(2)}. Consider using banks offering free transfers or bundled transfer packages.`
            );
        }

        // Check ATM fees
        const atmBreakdown = feeAudit.feeBreakdown.find(f => f.type === 'atm-fee');
        if (atmBreakdown && atmBreakdown.count > 5) {
            recommendations.push(
                `ATM fees of ₦${atmBreakdown.totalAmount.toFixed(2)} were incurred. Try using your bank's ATMs to avoid cross-bank charges.`
            );
        }

        // Hidden fees warning
        if (feeAudit.hiddenFeeCount > 10) {
            recommendations.push(
                `${feeAudit.hiddenFeeCount} hidden fees totaling ₦${feeAudit.totalHiddenFees.toFixed(2)} were detected. These are often overlooked fees like stamp duty, VAT, and electronic levies.`
            );
        }

        // General recommendation if high fees
        if (feeAudit.totalFees > 5000) {
            recommendations.push(
                `Total banking fees of ₦${feeAudit.totalFees.toFixed(2)} is significant. Consider reviewing your banking products and comparing with other banks.`
            );
        }

        return recommendations;
    }
}

export const feeDetectionProcessor = new FeeDetectionProcessor();
