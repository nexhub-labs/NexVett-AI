import { Transaction, AnalysisContext, ProcessorResult, BaseProcessor } from '../types/transaction';

/**
 * Abstract base class for all analysis processors
 */
export abstract class BaseProcessorImpl implements BaseProcessor {
    abstract readonly name: string;

    abstract process(context: AnalysisContext): Promise<ProcessorResult>;

    /**
     * Helper to create a successful result
     */
    protected success(data: any, transactions: Transaction[], processedCount: number = 0): ProcessorResult {
        return {
            success: true,
            transactions,
            data,
            errors: [],
            metadata: {
                processedCount,
                duration: 0 // Will be set by pipeline
            }
        };
    }

    /**
     * Helper to create a failed result
     */
    protected failure(error: string, transactions: Transaction[] = []): ProcessorResult {
        return {
            success: false,
            transactions,
            data: null,
            errors: [error],
            metadata: {
                processedCount: 0,
                duration: 0
            }
        };
    }

    /**
     * Helper to get transactions from context
     */
    protected getTransactions(context: AnalysisContext): Transaction[] {
        return context.transactions || [];
    }

    /**
     * Helper to get previous processor results
     */
    protected getPreviousResult<T>(context: AnalysisContext, processorName: string): T | null {
        return context.results?.[processorName] ?? null;
    }
}
