import type {
    Transaction,
    ParseResult,
} from '@nexvett-ai/shared';

/**
 * Shared transaction types used across client and server
 * Re-exporting from shared library
 */
export type { Transaction, ParseResult };

export interface AnalysisContext {
    transactions: Transaction[];
    metadata?: Record<string, any>;
    results: Record<string, any>;
}

export interface ProcessorResult {
    success: boolean;
    transactions: Transaction[];
    errors: string[];
    metadata?: Record<string, any>;
    data?: any;
}

export interface BaseProcessor {
    name: string;
    process(context: AnalysisContext): Promise<ProcessorResult>;
}
