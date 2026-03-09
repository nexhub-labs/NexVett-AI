import { Mastra } from '@mastra/core/mastra';
import * as yup from 'yup';
import { type ApiRoute } from '@mastra/core/server';
import { accountingAgent } from './agents/accounting-agent';
import { documentParseAgent } from './agents/document-parse-agent';
import { parseFile } from './api/parse-file';
import { analyzeTransactions } from './api/analyze-transactions';
import { analyzeAccounts } from './api/analyze-accounts';
import { enhanceAnalysisWithAgent } from './api/enhance-analysis';
import { analyzeMultiFile } from './api/analyze-multi-file';
import { Context } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import {
  globalSecurity,
  protectedSecurity,
  rateLimiter,
  sendJson,
  sendError,
  CORS_ORIGIN,
  CORS_HEADERS
} from './security';
import { ScrutinyService } from './scrutiny-service';
import {
  Message,
  AnalysisMode,
  chatRequestSchema,
  analyzeTransactionsSchema,
  analyzeAccountsSchema,
  analyzeMultiFileSchema,
  ParseResult,
  AnalysisResult,
  AccountsAnalysisResult,
  MultiFileAnalysisResult,
  parseResultSchema,
  analysisResultSchema,
  accountsAnalysisResultSchema,
  multiFileAnalysisResultSchema,
} from '@nexvett-ai/shared';
import { CoreMessage } from '@mastra/core';
import { createSupabaseServerClient, supabase } from '../lib/supabase';
import { logger } from './lib/logger';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import { persistAnalysisSummary, getOrCreateDefaultWallet } from './lib/db';


const DEFAULT_ANALYSIS_STATE = {
  analyzedTransactions: [],
  feeAudit: { totalHiddenFees: 0, feeCount: 0, feeBreakdown: [], recommendations: [] },
  categoryBreakdown: [],
  merchantSummary: [],
  patternInsights: { recurringTransactions: [], unusualTransactions: [], incomeVsExpense: { averageMonthlyIncome: 0, averageMonthlyExpenses: 0 } },
  summary: { totalTransactions: 0, totalIncome: 0, totalExpenses: 0, netFlow: 0, savingsRate: 0 },
  errors: [],
};

export const mastra = new Mastra({
  agents: { accountingAgent, documentParseAgent },
  logger: false, // logger: new PinoLogger({ name: 'Mastra', level: 'info' }),
  telemetry: { enabled: false }, // telemetry: { enabled: process.env.MASTRA_TELEMETRY_DISABLED === 'false' },
  observability: { default: { enabled: false } }, // observability: { default: { enabled: true } },
  server: {
    port: process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 4111,
    build: {
      apiReqLogs: false, // apiReqLogs: true,
    },
    middleware: [
      ...globalSecurity,
      async (c, next) => {
        try {
          await next();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Internal Server Error';

          // Handle Validation Errors (check by type or name)
          if (err instanceof yup.ValidationError || (err && typeof err === 'object' && 'name' in err && err.name === 'ValidationError')) {
            return sendError(c, message, 400);
          }

          // Log only message+name - full error object may include parsed request body with file data
          logger.error(`GLOBAL_ERROR [${err instanceof Error ? err.name : 'Error'}]: ${message}`);

          // If standard Error (or has message), return it, otherwise generic 500
          if (err instanceof Error || (err && typeof err === 'object' && 'message' in err)) {
            return sendError(c, message, 500);
          }

          return sendError(c, 'Internal Server Error', 500);
        }
      }
    ],
    apiRoutes: [
      {
        path: '/api/health-check',
        method: 'GET',
        handler: async (c: Context) => {
          return sendJson(c, {
            status: 'ok',
            supabase: !!supabase,
            env: {
              hasUrl: !!process.env.SUPABASE_URL,
              hasKey: !!process.env.SUPABASE_PUBLISHABLE_KEY
            }
          });
        }
      } as ApiRoute,
      {
        path: '/api/chat',
        method: 'POST',
        middleware: protectedSecurity,
        handler: async (c: Context) => {
          try {
            const body = await c.req.json().catch(() => ({}));
            const { messages } = ScrutinyService.validateInput<{ messages: Message[] }>(chatRequestSchema, body);

            const coreMessages: CoreMessage[] = messages.map(m => {
              const role = m.role;
              if (role === 'user') return { role: 'user', content: m.content };
              if (role === 'assistant') return { role: 'assistant', content: m.content };
              return { role: 'system', content: m.content };
            });

            if (coreMessages.length === 0) return sendError(c, 'No valid messages provided', 400);

            try {
              const result = await accountingAgent.stream(coreMessages, { format: 'aisdk' });
              const origin = c.req.header('origin') || c.req.header('Origin');

              return result.toTextStreamResponse({
                headers: {
                  ...CORS_HEADERS(origin),
                  'X-Accel-Buffering': 'no',
                },
              });
            } catch (err) {
              return sendError(c, err instanceof Error ? err.message : 'Agent execution failed');
            }
          } catch (error) {
            return sendError(c, error instanceof Error ? error.message : 'Unknown error');
          }
        },
      } as ApiRoute,
      {
        path: '/api/parse-file',
        method: 'POST',
        middleware: [rateLimiter],
        handler: async (c: Context) => {
          try {
            const body = await c.req.parseBody();

            // Bidirectional Scrutiny: Scrutinize Input
            ScrutinyService.validateInput(analyzeMultiFileSchema, body);

            const file = body.file;
            if (!file || !(file instanceof File)) return sendError(c, 'No file uploaded', 400, { transactions: [] });

            const rawResult = await parseFile(Buffer.from(await file.arrayBuffer()), file.name);

            // Bidirectional Scrutiny: Scrutinize Output (The Sieve)
            const result = ScrutinyService.secureOutput<ParseResult>(parseResultSchema, rawResult);

            return sendJson(c, result);
          } catch (error) {
            return sendError(c, `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, { transactions: [] });
          }
        },
      } as ApiRoute,
      {
        path: '/api/analyze-transactions',
        method: 'POST',
        middleware: protectedSecurity,
        handler: async (c: Context) => {
          try {
            const body = await c.req.json().catch(() => ({}));
            const { transactions } = ScrutinyService.validateInput<{ transactions: any[] }>(analyzeTransactionsSchema, body);

            const rawResult = await enhanceAnalysisWithAgent(await analyzeTransactions(transactions));

            // Bidirectional Scrutiny: Scrutinize Output (The Sieve)
            const result = ScrutinyService.secureOutput<AnalysisResult>(analysisResultSchema, rawResult);

            return sendJson(c, result);
          } catch (error) {
            return sendError(c, `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, DEFAULT_ANALYSIS_STATE);
          }
        },
      } as ApiRoute,
      {
        path: '/api/analyze-accounts',
        method: 'POST',
        middleware: protectedSecurity,
        handler: async (c: Context) => {
          try {
            const body = await c.req.json().catch(() => ({}));
            const { accounts } = ScrutinyService.validateInput<{ accounts: any[] }>(analyzeAccountsSchema, body);

            const rawResult = await analyzeAccounts(accounts);

            // Bidirectional Scrutiny: Scrutinize Output (The Sieve)
            const result = ScrutinyService.secureOutput<AccountsAnalysisResult>(accountsAnalysisResultSchema, rawResult);

            return sendJson(c, result);
          } catch (error) {
            return sendError(c, `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, { accounts: [], combined: { success: false, ...DEFAULT_ANALYSIS_STATE, errors: [] } });
          }
        },
      } as ApiRoute,
      {
        path: '/api/analyze-multi-file',
        method: 'POST',
        middleware: [rateLimiter, ...protectedSecurity],
        handler: async (c: Context) => {
          try {
            const body = await c.req.parseBody();
            const { mode } = ScrutinyService.validateInput<{ mode: AnalysisMode }>(analyzeMultiFileSchema, body);

            const fileEntries = Object.entries(body)
              .filter(([key, value]) => {
                // More robust check for File/Blob objects
                return key.startsWith('file') &&
                  value && typeof value === 'object' &&
                  'arrayBuffer' in value && typeof value.arrayBuffer === 'function';
              });

            const filePromises = fileEntries.map(async ([_, value]) => {
              const file = value as File;
              return {
                buffer: Buffer.from(await file.arrayBuffer()),
                filename: file.name || 'unknown_file',
                size: file.size || 0,
              };
            });

            const resolvedFiles = await Promise.all(filePromises);
            if (resolvedFiles.length === 0) {
              // logger.warn('MULTI_ANALYZE: No valid files identified in request body');
              return sendError(c, 'No files uploaded or invalid file format', 400, { mode });
            }

            // logger.info(`MULTI_ANALYZE: Processing ${resolvedFiles.length} files in mode: ${mode}`);
            const rawResult = await analyzeMultiFile(resolvedFiles, mode as AnalysisMode);

            // Privacy-First Persistence: Save aggregated summary if user is authenticated
            const user = c.get('user');
            const supabaseServer = createSupabaseServerClient(c);
            if (user && supabaseServer && rawResult.success) {
              try {
                // Ensure a default wallet exists (or could be passed from frontend later)
                // const wallet = await getOrCreateDefaultWallet(supabaseServer, user.id);

                await persistAnalysisSummary(supabaseServer, user.id, rawResult, {
                  mode,
                  device: c.req.header('user-agent'),
                  ip: c.req.header('x-forwarded-for') || 'unknown'
                });
              } catch (pErr) {
                // We don't fail the request if persistence fails, but we log it
                // Never log full pErr object — DB errors can include SQL with user IDs
                logger.warn(`PERSISTENCE_FAILED (non-fatal): ${pErr instanceof Error ? pErr.message : String(pErr)}`);
              }
            }

            // Bidirectional Scrutiny: Scrutinize Output (The Sieve)
            const result = ScrutinyService.secureOutput<MultiFileAnalysisResult>(multiFileAnalysisResultSchema, rawResult);

            return sendJson(c, result);
          } catch (error) {
            // Log only message — full error from file pipeline may contain partial transaction data
            logger.error(`MULTI_ANALYZE_ROUTE_ERROR: ${error instanceof Error ? error.message : String(error)}`);
            return sendError(c, `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, { mode: 'unknown' });
          }
        },
      } as ApiRoute,
      {
        path: '/api/auth/logout',
        method: 'POST',
        handler: async (c: Context) => {
          const supabaseServer = createSupabaseServerClient(c);
          if (supabaseServer) {
            await supabaseServer.auth.signOut();
          }
          return sendJson(c, { success: true });
        },
      } as ApiRoute,
      {
        path: '/api/auth/google',
        method: 'GET',
        handler: async (c: Context) => {
          const supabaseServer = createSupabaseServerClient(c);
          if (!supabaseServer) return sendError(c, 'Auth service unavailable', 500);

          // Capture intended redirect URL from query param
          const redirectPath = c.req.query('redirect') || '/';

          const { data, error } = await supabaseServer.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${CORS_ORIGIN}/api/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
              queryParams: {
                prompt: 'select_account',
                access_type: 'offline',
              },
            },
          });

          if (error) {
            logger.error('GOOGLE_OAUTH_START_ERROR:', error.message);
            return sendError(c, error.message, 400);
          }

          return c.redirect(data.url);
        },
      } as ApiRoute,
      {
        path: '/api/auth/callback',
        method: 'GET',
        handler: async (c: Context) => {
          const code = c.req.query('code');
          const errorMsg = c.req.query('error_description') || c.req.query('error');
          const redirectPath = c.req.query('redirect') || '/';

          if (errorMsg) {
            // logger.warn('AUTH_CALLBACK_EXTERNAL_ERROR:', errorMsg);
            return c.redirect(`${CORS_ORIGIN}/signin?error=${encodeURIComponent(errorMsg)}`);
          }

          const supabaseServer = createSupabaseServerClient(c);
          if (!code || !supabaseServer) {
            logger.error('AUTH_CALLBACK_MISSING_CODE_OR_SUPABASE');
            return c.redirect(`${CORS_ORIGIN}/signin?error=auth_callback_failed`);
          }

          try {
            const { data, error } = await supabaseServer.auth.exchangeCodeForSession(code);
            if (error) {
              logger.error('AUTH_SESSION_EXCHANGE_ERROR:', error.message);
              return c.redirect(`${CORS_ORIGIN}/signin?error=${encodeURIComponent(error.message)}`);
            }

            if (data.session) {
              // Standard Supabase SSR: Cookies are updated automatically by high-level methods
              // if setAll was provided to createServerClient.
            }

            // Redirect to the originally intended path after successful auth
            return c.redirect(`${CORS_ORIGIN}${redirectPath}`);
          } catch (err) {
            // Log only message — full exception could surface OAuth code/token fragments
            logger.error(`AUTH_CALLBACK_EXCEPTION: ${err instanceof Error ? err.message : 'unknown error'}`);
            return c.redirect(`${CORS_ORIGIN}/signin?error=internal_callback_error`);
          }
        },
      } as ApiRoute,
      {
        path: '/api/auth/session',
        method: 'GET',
        handler: async (c: Context) => {
          const supabaseServer = createSupabaseServerClient(c);
          if (!supabaseServer) return sendJson(c, { user: null });

          // Standard Supabase SSR: getUser() handles everything (cookies, refresh)
          const { data: { user } } = await supabaseServer.auth.getUser();

          if (user) {
            // Background check: Ensure profile exists
            // (In a real app, this might be handled by a Supabase edge function on signup)
            // Never log full DB error — log only message string to avoid leaking user context
            getOrCreateDefaultWallet(supabaseServer, user.id).catch(e =>
              logger.warn(`BG_PROFILE_INIT_ERROR (non-fatal): ${e instanceof Error ? e.message : String(e)}`)
            );
          }

          return sendJson(c, { user: user || null });
        },
      } as ApiRoute,
      {
        path: '/api/account/history',
        method: 'GET',
        middleware: protectedSecurity,
        handler: async (c: Context) => {
          const supabaseServer = createSupabaseServerClient(c);
          const user = c.get('user');
          if (!supabaseServer || !user) return sendError(c, 'Auth required', 401);

          const { data, error } = await supabaseServer
            .from('analysis_summaries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) return sendError(c, error.message, 500);
          return sendJson(c, { history: data });
        }
      } as ApiRoute,
      {
        path: '/api/account/profile',
        method: 'GET',
        middleware: protectedSecurity,
        handler: async (c: Context) => {
          const supabaseServer = createSupabaseServerClient(c);
          const user = c.get('user');
          if (!supabaseServer || !user) return sendError(c, 'Auth required', 401);

          const { data, error } = await supabaseServer
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) return sendJson(c, { profile: data });

          // If profile missing, create one on the fly
          const { data: newProfile, error: createError } = await supabaseServer
            .from('user_profiles')
            .insert({ id: user.id, display_name: user.email?.split('@')[0] })
            .select()
            .single();

          if (createError) return sendError(c, createError.message, 500);
          return sendJson(c, { profile: newProfile });
        }
      } as ApiRoute,
      {
        path: '/api/account/profile',
        method: 'PUT',
        middleware: protectedSecurity,
        handler: async (c: Context) => {
          const supabaseServer = createSupabaseServerClient(c);
          const user = c.get('user');
          if (!supabaseServer || !user) return sendError(c, 'Auth required', 401);

          const body = await c.req.json().catch(() => ({}));
          const { display_name, base_currency, preferences } = body;

          const { data, error } = await supabaseServer
            .from('user_profiles')
            .update({ display_name, base_currency, preferences })
            .eq('id', user.id)
            .select()
            .single();

          if (error) return sendError(c, error.message, 500);
          return sendJson(c, { profile: data });
        }
      } as ApiRoute,
    ],
  },
});
