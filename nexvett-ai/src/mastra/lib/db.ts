import { SupabaseClient } from '@supabase/supabase-js';
import { MultiFileAnalysisResult } from '../types/multi-file';
import { createLogger } from './logger';

const logger = createLogger('DB');

/**
 * Persist an aggregated analysis summary to the database.
 * Following Privacy-First architecture: only sums, categories, and trends are stored.
 */
export async function persistAnalysisSummary(
    supabase: SupabaseClient,
    userId: string,
    analysisResult: MultiFileAnalysisResult,
    metadata: Record<string, unknown> = {}
) {
    if (!analysisResult.success || !analysisResult.unified) {
        logger.warn('Skipping persistence: Analysis was unsuccessful or missing unified result');
        return null;
    }

    const { unified } = analysisResult;
    const { summary } = unified;

    try {
        const { data, error } = await supabase
            .from('analysis_summaries')
            .insert({
                user_id: userId,
                period_start: metadata.periodStart || new Date().toISOString(), // Fallback to now
                period_end: metadata.periodEnd || new Date().toISOString(),
                total_income: summary.totalIncome,
                total_expenses: summary.totalExpenses,
                category_breakdown: unified.combined.analysis.categoryBreakdown,
                top_merchants: unified.combined.analysis.merchantSummary || [],
                metadata: {
                    ...metadata,
                    file_count: summary.totalFiles,
                    transaction_count: summary.totalTransactions,
                    net_flow: summary.netFlow,
                }
            })
            .select()
            .single();

        if (error) {
            // Downgrade to warn: analysis is returned successfully to the user even without persistence
            logger.warn(`Failed to persist analysis summary (non-fatal): ${error.message}`);
            return null;
        }

        logger.info(`Successfully persisted analysis summary ID: ${data.id}`);
        return data;
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String(err.message) : String(err);
        logger.warn(`Unexpected error during summary persistence (non-fatal): ${errorMessage}`);
        return null;
    }
}

/**
 * Ensure a default wallet exists for the user or fetch an existing one.
 */
export async function getOrCreateDefaultWallet(supabase: SupabaseClient, userId: string, currency: string = 'NGN') {
    try {
        const { data: wallets, error: fetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .limit(1);

        if (fetchError) throw fetchError;

        if (wallets && wallets.length > 0) {
            return wallets[0];
        }

        const { data: newWallet, error: insertError } = await supabase
            .from('wallets')
            .insert({
                user_id: userId,
                name: 'Primary Wallet',
                currency: currency,
                metadata: { is_default: true }
            })
            .select()
            .single();

        if (insertError) {
            logger.error(`Failed to create default wallet: ${insertError.message}`, insertError);
            throw insertError;
        }

        return newWallet;
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String(err.message) : String(err);
        logger.error(`Error in getOrCreateDefaultWallet: ${errorMessage}`, err);
        return null;
    }
}
