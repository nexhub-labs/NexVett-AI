// Consolidated Shared Types
import * as yup from 'yup';

// --- Auth Types & Schemas ---

export interface SharedUser {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    created_at?: string;
}

export interface SharedSession {
    user: SharedUser | null;
}

// --- Financial / Parser Types ---

export const transactionSchema = yup.object({
    date: yup.mixed<Date | string>().required(),
    amount: yup.number().required(),
    narration: yup.string().required(),
    type: yup.string().oneOf(['debit', 'credit']).required(),
    balance: yup.number().optional(),
    source: yup.string().optional(),
    page: yup.number().optional(),
    reference: yup.string().optional(),
});

export const accountDataSchema = yup.object({
    accountName: yup.string().required(),
    transactions: yup.array().of(transactionSchema).required(),
    summary: yup.object({
        totalTransactions: yup.number().required(),
        totalDebit: yup.number().required(),
        totalCredit: yup.number().required(),
        dateRange: yup.object({
            start: yup.mixed<Date | string>().nullable().defined(),
            end: yup.mixed<Date | string>().nullable().defined(),
        }).required(),
    }).optional(),
});

export interface Transaction extends yup.InferType<typeof transactionSchema> { }
export interface AccountData extends yup.InferType<typeof accountDataSchema> { }

export interface ParseResult {
    success: boolean;
    transactions: Transaction[];
    errors: string[];
    summary?: {
        totalTransactions: number;
        totalDebit: number;
        totalCredit: number;
        dateRange: {
            start: string | null;
            end: string | null;
        };
    };
    metadata?: {
        bankName?: string;
        accountNumber?: string;
        accountName?: string;
        statementPeriod?: string;
    };
    accounts?: AccountData[];
}

// --- Chat / AI Types ---

export const messagePartSchema = yup.object({
    type: yup.string().oneOf(['text', 'image', 'file']).required(),
    text: yup.string().optional(),
    url: yup.string().optional(),
    mimeType: yup.string().optional(),
});

export const messageSchema = yup.object({
    id: yup.string().required(),
    role: yup.string().oneOf(['user', 'assistant', 'system']).required(),
    content: yup.string().required(),
    createdAt: yup.number().optional(),
    parts: yup.array().of(messagePartSchema).optional(),
});

export interface Message extends yup.InferType<typeof messageSchema> { }

export interface CoreMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: unknown[];
    toolCallId?: string;
}

export interface SharedMessageList extends Array<Message> { }

export const chatRequestSchema = yup.object({
    messages: yup.array().of(messageSchema).required(),
});


// --- Analysis Types ---
export type AnalysisMode = 'single' | 'unified';

export interface AnalysisResult {
    success: boolean;
    analyzedTransactions: Array<{
        date: string;
        amount: number;
        narration: string;
        type: 'debit' | 'credit';
        normalizedCategory: string;
        subCategory?: string;
        merchantName?: string;
        isHiddenFee: boolean;
    }>;
    feeAudit: {
        totalHiddenFees: number;
        feeCount: number;
        feeBreakdown: Array<{ type: string; count: number; totalAmount: number }>;
        recommendations: string[];
    };
    categoryBreakdown: Array<{ category: string; count: number; totalAmount: number; percentage: number }>;
    merchantSummary: Array<{ merchant: string; count: number; totalSpent: number }>;
    patternInsights: {
        recurringTransactions: Array<{ description: string; amount: number; frequency: string; occurrences: number }>;
        unusualTransactions: Array<{ narration: string; amount: number; reason: string }>;
        incomeVsExpense: { averageMonthlyIncome: number; averageMonthlyExpenses: number };
    };
    summary: {
        totalTransactions: number;
        totalIncome: number;
        totalExpenses: number;
        netFlow: number;
        savingsRate: number;
    };
    errors: string[];
    agentInsights?: {
        summary: string;
        keyFindings: string[];
        recommendations: string[];
        warnings: string[];
    };
}

export interface FileMetadata {
    id: string;
    name: string;
    size: number;
    uploadedAt: string | Date;
    type: 'csv' | 'xlsx' | 'pdf';
}

export interface TransactionWithSource extends Omit<Transaction, 'date'> {
    date: Date | string;
    sourceFileId: string;
    sourceFileName: string;
    category?: string;
    isHiddenFee?: boolean;
}

export interface CombinedAnalysisResult {
    transactions: TransactionWithSource[];
    analysis: AnalysisResult;
    fileContributions: Array<{
        fileId: string;
        fileName: string;
        transactionCount: number;
        percentage: number;
    }>;
}

export interface SeparateAnalysisResult {
    files: Array<{
        fileId: string;
        fileName: string;
        transactions: Transaction[];
        analysis: AnalysisResult;
        metadata: FileMetadata;
    }>;
    aggregate: {
        totalTransactions: number;
        totalIncome: number;
        totalExpenses: number;
        netFlow: number;
    };
}

export interface ComparisonMetrics {
    totalTransactions: number[];
    totalIncome: number[];
    totalExpenses: number[];
    netFlow: number[];
    topCategories: Array<Array<{ category: string; amount: number; percentage: number }>>;
    hiddenFees: number[];
}

export interface CompareAnalysisResult {
    files: Array<{
        fileId: string;
        fileName: string;
    }>;
    comparison: ComparisonMetrics;
    insights: string[];
    trends: {
        incomeChange: number;
        expenseChange: number;
        savingsRateChange: number;
    };
}

export interface UnifiedAnalysisResult {
    files: Array<{
        fileId: string;
        fileName: string;
        transactions: Transaction[];
        analysis: AnalysisResult;
        metadata: FileMetadata;
    }>;
    combined: CombinedAnalysisResult;
    summary: {
        totalFiles: number;
        totalTransactions: number;
        totalIncome: number;
        totalExpenses: number;
        netFlow: number;
    };
}

export interface MultiFileAnalysisResult {
    mode: AnalysisMode;
    success: boolean;
    errors: string[];
    combined?: CombinedAnalysisResult;
    separate?: SeparateAnalysisResult;
    compare?: CompareAnalysisResult;
    unified?: UnifiedAnalysisResult;
}

export interface AccountAnalysis {
    accountName: string;
    analysis: AnalysisResult;
}

export interface AccountsAnalysisResult {
    success: boolean;
    accounts: AccountAnalysis[];
    combined: AnalysisResult;
    errors: string[];
}

export const analyzeTransactionsSchema = yup.object({
    transactions: yup.array().of(transactionSchema).required(),
});

export const analyzeAccountsSchema = yup.object({
    accounts: yup.array().of(accountDataSchema).required(),
});

export const analyzeMultiFileSchema = yup.object({
    mode: yup.string().oneOf(['single', 'unified']).required(),
});

// --- Result Schemas (For Output Scrutiny / Sieving) ---

export const parseResultSchema = yup.object({
    success: yup.boolean().required(),
    transactions: yup.array().of(transactionSchema).required(),
    errors: yup.array().of(yup.string()).required(),
    summary: yup.object({
        totalTransactions: yup.number().required(),
        totalDebit: yup.number().required(),
        totalCredit: yup.number().required(),
        dateRange: yup.object({
            start: yup.mixed<Date | string>().nullable().defined(),
            end: yup.mixed<Date | string>().nullable().defined(),
        }).required(),
    }).optional(),
    metadata: yup.object({
        bankName: yup.string().optional(),
        accountNumber: yup.string().optional(),
        accountName: yup.string().optional(),
        statementPeriod: yup.string().optional(),
    }).optional(),
    accounts: yup.array().of(accountDataSchema).optional(),
});

export const analysisResultSchema = yup.object({
    success: yup.boolean().required(),
    analyzedTransactions: yup.array().of(yup.object({
        date: yup.mixed<Date | string>().required(),
        amount: yup.number().required(),
        narration: yup.string().required(),
        type: yup.string().oneOf(['debit', 'credit']).required(),
        normalizedCategory: yup.string().required(),
        subCategory: yup.string().optional(),
        merchantName: yup.string().optional(),
        isHiddenFee: yup.boolean().required(),
    })).required(),
    feeAudit: yup.object({
        totalHiddenFees: yup.number().required(),
        feeCount: yup.number().required(),
        feeBreakdown: yup.array().of(yup.object({
            type: yup.string().required(),
            count: yup.number().required(),
            totalAmount: yup.number().required(),
        })).required(),
        recommendations: yup.array().of(yup.string()).required(),
    }).required(),
    categoryBreakdown: yup.array().of(yup.object({
        category: yup.string().required(),
        count: yup.number().required(),
        totalAmount: yup.number().required(),
        percentage: yup.number().required(),
    })).required(),
    merchantSummary: yup.array().of(yup.object({
        merchant: yup.string().required(),
        count: yup.number().required(),
        totalSpent: yup.number().required(),
    })).required(),
    patternInsights: yup.object({
        recurringTransactions: yup.array().of(yup.object({
            description: yup.string().required(),
            amount: yup.number().required(),
            frequency: yup.string().required(),
            occurrences: yup.number().required(),
        })).required(),
        unusualTransactions: yup.array().of(yup.object({
            narration: yup.string().required(),
            amount: yup.number().required(),
            reason: yup.string().required(),
        })).required(),
        incomeVsExpense: yup.object({
            averageMonthlyIncome: yup.number().required(),
            averageMonthlyExpenses: yup.number().required(),
        }).required(),
    }).required(),
    summary: yup.object({
        totalTransactions: yup.number().required(),
        totalIncome: yup.number().required(),
        totalExpenses: yup.number().required(),
        netFlow: yup.number().required(),
        savingsRate: yup.number().required(),
    }).required(),
    errors: yup.array().of(yup.string()).required(),
    agentInsights: yup.object({
        summary: yup.string().required(),
        keyFindings: yup.array().of(yup.string()).default([]).required(),
        recommendations: yup.array().of(yup.string()).default([]).required(),
        warnings: yup.array().of(yup.string()).default([]).required(),
    }).optional(),
});

export const combinedAnalysisResultSchema = yup.object({
    transactions: yup.array().of(yup.object({
        date: yup.mixed<Date | string>().required(),
        amount: yup.number().required(),
        narration: yup.string().required(),
        type: yup.string().oneOf(['debit', 'credit']).required(),
        sourceFileId: yup.string().required(),
        sourceFileName: yup.string().required(),
        category: yup.string().optional(),
        isHiddenFee: yup.boolean().optional(),
    })).required(),
    analysis: analysisResultSchema,
    fileContributions: yup.array().of(yup.object({
        fileId: yup.string().required(),
        fileName: yup.string().required(),
        transactionCount: yup.number().required(),
        percentage: yup.number().required(),
    })).required(),
});

export const separateAnalysisResultSchema = yup.object({
    files: yup.array().of(yup.object({
        fileId: yup.string().required(),
        fileName: yup.string().required(),
        transactions: yup.array().of(transactionSchema).required(),
        analysis: analysisResultSchema,
        metadata: yup.object({
            id: yup.string().required(),
            name: yup.string().required(),
            size: yup.number().required(),
            uploadedAt: yup.string().required(),
            type: yup.string().oneOf(['csv', 'xlsx', 'pdf']).required(),
        }).required(),
    })).required(),
    aggregate: yup.object({
        totalTransactions: yup.number().required(),
        totalIncome: yup.number().required(),
        totalExpenses: yup.number().required(),
        netFlow: yup.number().required(),
    }).required(),
});

export const unifiedAnalysisResultSchema = yup.object({
    files: yup.array().of(yup.object({
        fileId: yup.string().required(),
        fileName: yup.string().required(),
        transactions: yup.array().of(transactionSchema).required(),
        analysis: analysisResultSchema,
        metadata: yup.object({
            id: yup.string().required(),
            name: yup.string().required(),
            size: yup.number().required(),
            uploadedAt: yup.string().required(),
            type: yup.string().oneOf(['csv', 'xlsx', 'pdf']).required(),
        }).required(),
    })).required(),
    combined: combinedAnalysisResultSchema,
    summary: yup.object({
        totalFiles: yup.number().required(),
        totalTransactions: yup.number().required(),
        totalIncome: yup.number().required(),
        totalExpenses: yup.number().required(),
        netFlow: yup.number().required(),
    }).required(),
});

export const multiFileAnalysisResultSchema = yup.object({
    mode: yup.string().oneOf(['single', 'unified']).required(),
    success: yup.boolean().required(),
    errors: yup.array().of(yup.string()).required(),
    unified: unifiedAnalysisResultSchema.optional(),
    // Backward Compatibility Fields (Must be explicitly allowed to pass the Sieve)
    combined: combinedAnalysisResultSchema.optional(),
    separate: separateAnalysisResultSchema.optional(),
});

export const accountsAnalysisResultSchema = yup.object({
    success: yup.boolean().required(),
    accounts: yup.array().of(yup.object({
        accountName: yup.string().required(),
        analysis: analysisResultSchema,
    })).required(),
    combined: analysisResultSchema.required(),
    errors: yup.array().of(yup.string()).required(),
});

// --- Parser Interfaces ---

export type CellValue = string | number | boolean | null | undefined;

export interface BankParser {
    name: string;
    detect(content: string | CellValue[][]): boolean;
    parse(buffer: Buffer, filename: string): Promise<ParseResult>;
}

export interface ColumnMapping {
    date?: number;
    amount?: number;
    debit?: number;
    credit?: number;
    narration?: number;
    balance?: number;
    reference?: number;
}

// --- API Types ---
export interface ApiErrorResponse {
    success: boolean;
    error: string;
    errors: string[];
}

// --- Sanitization Utils ---
export * from './sanitize.js';
