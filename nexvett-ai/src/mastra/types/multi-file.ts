import type {
  AnalysisMode,
  TransactionWithSource,
  CombinedAnalysisResult,
  SeparateAnalysisResult,
  CompareAnalysisResult,
  UnifiedAnalysisResult,
  MultiFileAnalysisResult,
  FileMetadata,
} from '@nexvett-ai/shared';

export type {
  AnalysisMode,
  TransactionWithSource,
  CombinedAnalysisResult,
  SeparateAnalysisResult,
  CompareAnalysisResult,
  UnifiedAnalysisResult,
  MultiFileAnalysisResult,
};

/**
 * Multi-file analysis request
 * This remains local as it uses Buffer for binary processing
 */
export interface MultiFileAnalysisRequest {
  files: Array<{
    buffer: Buffer;
    filename: string;
    size: number;
  }>;
  mode: AnalysisMode;
}
