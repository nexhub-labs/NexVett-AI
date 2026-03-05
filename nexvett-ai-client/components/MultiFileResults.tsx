import { MultiFileUnifiedView } from "./MultiFileUnifiedView";
import { MultiFileAnalysisResult } from "@nexvett-ai/shared";
import { Transaction } from "@nexvett-ai/shared";

interface MultiFileResultsProps {
  result: MultiFileAnalysisResult;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function MultiFileResults({ result, onTransactionClick }: MultiFileResultsProps) {
  return <MultiFileUnifiedView result={result} onTransactionClick={onTransactionClick} />;
}
