import { createClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { Context } from 'hono';
import { setCookie } from 'hono/cookie';
import { logger } from '../mastra/lib/logger';
import { CookieOptions } from 'hono/utils/cookie';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY!;

// 1. Static client for backend tasks (optional but useful)
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

/**
 * World-Class Security: Server Client Factory
 * Follows the official Supabase SSR pattern for Hono/Node.js
 */
export const createSupabaseServerClient = (c: Context) => {
    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    // 1. Check for existing client in context to avoid redundant initializers
    const existingClient = c.get('supabaseServer');
    if (existingClient) {
        return existingClient;
    }

    const origin = c.req.header('origin') || '';
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    const client = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                const cookies = parseCookieHeader(c.req.header('Cookie') ?? '');
                return cookies.map(cookie => ({ name: cookie.name, value: cookie.value ?? '' }));
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    try {
                        const honoOptions: CookieOptions = {
                            ...options,
                            sameSite: (options.sameSite as CookieOptions['sameSite']) || 'Lax',
                            secure: options.secure ?? !isLocalhost,
                            httpOnly: options.httpOnly ?? true,
                            path: options.path ?? '/',
                        };

                        // Primary method: Hono's setCookie is robust
                        setCookie(c, name, value, honoOptions);

                        // Fallback: If context is already finalized, setCookie might not propagate
                        // so we also append to headers directly if possible
                        if (((c as unknown) as { finalized?: boolean }).finalized) {
                            const cookieParts = [`${name}=${value}`, `Path=${honoOptions.path}`, `SameSite=${honoOptions.sameSite}`];
                            if (honoOptions.httpOnly) cookieParts.push('HttpOnly');
                            if (honoOptions.secure) cookieParts.push('Secure');
                            if (honoOptions.maxAge) cookieParts.push(`Max-Age=${honoOptions.maxAge}`);

                            c.header('Set-Cookie', cookieParts.join('; '), { append: true });
                        }
                    } catch (err) {
                        logger.error('SUPABASE_SSR_COOKIE_ERROR:', { name, error: err instanceof Error ? err.message : String(err) });
                    }
                });
            },
        },
    });

    // 2. Cache the client in the context for this request
    c.set('supabaseServer', client);

    return client;
};

if (!supabase) {
    logger.warn('Supabase URL or Key is missing. Auth features will be disabled.');
}
