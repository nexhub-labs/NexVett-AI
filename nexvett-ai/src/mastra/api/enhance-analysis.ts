import { accountingAgent } from '../agents/accounting-agent';
import type { AnalysisResult } from '@nexvett-ai/shared';
import { logger } from '../lib/logger';

export async function enhanceAnalysisWithAgent(
  analysis: AnalysisResult
): Promise<AnalysisResult> {
  if (!analysis.success) {
    return analysis;
  }

  try {
    const insightsPrompt = `You are analyzing a user's bank statement. Based on the following computed insights, provide a brief executive summary with key findings, actionable recommendations, and any warnings.

ANALYSIS DATA:
${JSON.stringify({
      summary: analysis.summary,
      feeAudit: analysis.feeAudit,
      topCategories: analysis.categoryBreakdown.slice(0, 5),
      recurringTransactions: analysis.patternInsights.recurringTransactions.slice(0, 3),
      unusualTransactions: analysis.patternInsights.unusualTransactions.slice(0, 3),
      incomeVsExpense: analysis.patternInsights.incomeVsExpense,
    }, null, 2)}

Provide your response in the following JSON format:
{
  "summary": "1-2 sentence executive summary of their financial health",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "warnings": ["warning 1 if any", "warning 2 if any"]
}

Be concise, specific to Nigerian banking context, and focus on actionable insights.`;

    const response = await accountingAgent.stream([
      {
        role: 'user',
        content: insightsPrompt,
      },
    ]);

    let responseText = '';
    for await (const chunk of response.textStream) {
      responseText += chunk;
    }

    let agentInsights = {
      summary: '',
      keyFindings: [] as string[],
      recommendations: [] as string[],
      warnings: [] as string[],
    };

    try {
      let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
      }

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        agentInsights = {
          summary: parsed.summary || '',
          keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        };
      }
    } catch {
      agentInsights = {
        summary: responseText.substring(0, 200),
        keyFindings: [],
        recommendations: [],
        warnings: [],
      };
    }

    return {
      ...analysis,
      agentInsights,
    };
  } catch (error) {
    // Never log full error — may contain partial LLM response text with financial summary data
    logger.error(`Agent enhancement failed: ${error instanceof Error ? error.message : String(error)}`);
    return analysis;
  }
}
