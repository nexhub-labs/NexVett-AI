import { AnalysisContext, ProcessorResult, BaseProcessor, Transaction } from '../types/transaction';
import { categorizationProcessor, CategorizationProcessor, CategorizationResult } from './categorization-processor';
import { feeDetectionProcessor, FeeDetectionProcessor, FeeDetectionResult } from './fee-detection-processor';
import { merchantNormalizer, MerchantNormalizer, MerchantNormalizationResult } from './merchant-normalizer';
import { patternAnalyzer, PatternAnalyzer, PatternAnalysisResult } from './pattern-analyzer';
import { aggregationProcessor, AggregationProcessor, AggregationResult } from './aggregation-processor';

// Re-export all processors and types
export * from './base-processor';
export * from './categorization-processor';
export * from './fee-detection-processor';
export * from './merchant-normalizer';
export * from './pattern-analyzer';
export * from './aggregation-processor';

export interface PipelineResult {
    success: boolean;
    transactions: Transaction[];
    categorization: CategorizationResult | null;
    feeDetection: FeeDetectionResult | null;
    merchantNormalization: MerchantNormalizationResult | null;
    patternAnalysis: PatternAnalysisResult | null;
    aggregation: AggregationResult | null;
    errors: string[];
    metadata: {
        processedAt: Date;
        totalDuration: number;
        processorResults: Record<string, { success: boolean; duration: number; processedCount: number }>;
    };
}

/**
 * Analyzer Pipeline
 * Orchestrates all processors in sequence
 */
export class AnalyzerPipeline {
    private processors: BaseProcessor[] = [];

    constructor() {
        // Register default processors in order
        this.registerProcessor(categorizationProcessor);
        this.registerProcessor(feeDetectionProcessor);
        this.registerProcessor(merchantNormalizer);
        this.registerProcessor(patternAnalyzer);
        this.registerProcessor(aggregationProcessor);
    }

    registerProcessor(processor: BaseProcessor): void {
        this.processors.push(processor);
    }

    clearProcessors(): void {
        this.processors = [];
    }

    async analyze(transactions: Transaction[], metadata?: AnalysisContext['metadata']): Promise<PipelineResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const processorResults: Record<string, { success: boolean; duration: number; processedCount: number }> = {};

        // Initialize context
        const context: AnalysisContext = {
            transactions,
            metadata: metadata || {},
            results: {}
        };

        // Run each processor
        for (const processor of this.processors) {
            const processorStart = Date.now();

            try {
                const result = await processor.process(context);
                const duration = Date.now() - processorStart;

                processorResults[processor.name] = {
                    success: result.success,
                    duration,
                    processedCount: result.metadata?.processedCount || 0
                };

                if (result.success) {
                    context.results[processor.name] = result.data;
                } else {
                    errors.push(...result.errors);
                }
            } catch (error) {
                const duration = Date.now() - processorStart;
                processorResults[processor.name] = { success: false, duration, processedCount: 0 };
                errors.push(`${processor.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        const totalDuration = Date.now() - startTime;

        return {
            success: errors.length === 0,
            transactions,
            categorization: context.results['categorization'] || null,
            feeDetection: context.results['fee-detection'] || null,
            merchantNormalization: context.results['merchant-normalizer'] || null,
            patternAnalysis: context.results['pattern-analyzer'] || null,
            aggregation: context.results['aggregation'] || null,
            errors,
            metadata: {
                processedAt: new Date(),
                totalDuration,
                processorResults
            }
        };
    }
}

// Export singleton instance
export const analyzerPipeline = new AnalyzerPipeline();
