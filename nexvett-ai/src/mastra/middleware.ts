import { Context } from 'hono';
import { cors } from 'hono/cors';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import { createSupabaseServerClient } from '../lib/supabase';
import { checkApiKeyBypass, checkAuthBypass } from './route-policies';
import { logSecurityViolation, createRequestFingerprint, logRequestFingerprint, logSecurityDecision } from './security-logger';
import crypto from 'crypto';

const configuredOrigin = process.env.CORS_ORIGIN;

if (!configuredOrigin) {
    // Fail-fast: The application must not start without a configured origin.
    throw new Error('CORS_ORIGIN environment variable is required.');
}

// Support comma-separated list of origins
const ALLOWED_ORIGINS = configuredOrigin.split(',').map(o => o.trim());

// We export the first one for backwards compatibility or single-origin use cases
export const CORS_ORIGIN: string = ALLOWED_ORIGINS[0];

/**
 * World-Class Security: CORS Helper
 * Determines the appropriate Access-Control-Allow-Origin header value.
 * STRICT POLICY: Wildcards ('*') are forbidden. All origins must be explicitly allowlisted.
 * 
 * Logic:
 * 1. If requester origin matches an allowlist entry, return it (Mirroring).
 * 2. If no match, return the primary configured origin (Fail-Safe to primary).
 * 3. Never returns '*' as a literal value.
 */
function getAuthorizedOrigin(origin: string | undefined): string | null {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        return origin;
    }

    // Safety fallback: Always default to the primary configured origin
    // This ensures we always have a valid, non-wildcard value.
    return CORS_ORIGIN;
}

export const CORS_HEADERS = (origin?: string) => {
    const authorizedOrigin = getAuthorizedOrigin(origin) || CORS_ORIGIN;
    return {
        'Access-Control-Allow-Origin': authorizedOrigin,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
    };
};

export const corsMiddleware = async (c: Context, next: () => Promise<void>) => {
    // const originHeader = c.req.header('origin') || c.req.header('Origin');

    // logger.debug('[CORS] Processing request', {
    //     path: c.req.path,
    //     method: c.req.method,
    //     origin: originHeader
    // });

    const middleware = cors({
        origin: (origin) => {
            const authorizedOrigin = getAuthorizedOrigin(origin);
            // logger.debug('[CORS] Resolved Origin:', {
            //     requested: origin,
            //     resolved: authorizedOrigin
            // });
            // Hono's cors middleware will skip setting the header if origin returns null
            return authorizedOrigin;
        },
        credentials: true,
        allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-KEY', 'X-Requested-With'],
        maxAge: 600,
    });

    return middleware(c, next);
};

export const sendJson = <T>(c: Context, data: T, status: ContentfulStatusCode = 200) => {
    return c.json(data, status);
};

export const sendError = (c: Context, message: string, status: ContentfulStatusCode = 500, extraData: Record<string, unknown> = {}) =>
    sendJson(c, { success: false, error: message, errors: [message], ...extraData }, status);

export const authMiddleware = async (c: Context, next: () => Promise<void>) => {
    const path = c.req.path;
    const method = c.req.method;
    const ip = c.req.header('x-forwarded-for') || 'unknown';

    // 1. Policy-Driven Bypass: Check if route requires auth
    if (checkAuthBypass(path, method, ip)) {
        return await next();
    }

    const supabaseServer = createSupabaseServerClient(c);
    if (!supabaseServer) {
        logSecurityViolation('AUTH_SERVICE_UNAVAILABLE', { path, ip });
        return sendError(c, 'Auth service unavailable', 500);
    }

    // Using getUser() without token will automatically check cookies
    const { data: { user }, error } = await supabaseServer.auth.getUser();

    if (!error && user) {
        c.set('user', user);
        return await next();
    }

    logSecurityViolation('UNAUTHORIZED_ACCESS_ATTEMPT', { path, ip, error: error?.message });
    return sendError(c, 'Unauthorized', 401);
};

/**
 * World-Class Security: Advanced CSRF & Origin Protection
 */
export const csrfProtection = async (c: Context, next: () => Promise<void>) => {
    const origin = c.req.header('origin') || c.req.header('referer');
    const method = c.req.method;

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (c.req.path.startsWith('/__')) {
            await next();
            return;
        }

        const requestedWith = c.req.header('x-requested-with');

        // Multi-Origin CSRF Validation: Check if origin/referer is in ALLOWED_ORIGINS
        const isAuthorizedOrigin = origin && ALLOWED_ORIGINS.some(ao => origin.startsWith(ao));

        if (!origin || !isAuthorizedOrigin || !requestedWith) {
            // logger.error('CSRF_BLOCK:', { origin, method, path: c.req.path, requestedWith });
            return c.json({ success: false, error: 'Forbidden: Invalid request origin or missing required headers.' }, 403, CORS_HEADERS(origin));
        }
    }
    await next();
};

/**
 * World-Class Security: Rate Limiting
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_REQUESTS = 20;

export const rateLimiter = async (c: Context, next: () => Promise<void>) => {
    const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

    if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + RATE_LIMIT_WINDOW;
    } else {
        record.count++;
    }

    rateLimitMap.set(ip, record);

    if (record.count > MAX_REQUESTS) {
        c.header('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
        const origin = c.req.header('origin') || c.req.header('Origin');
        return c.json({ success: false, error: 'Too many attempts. Please try again later.' }, 429, CORS_HEADERS(origin));
    }

    await next();
};

/**
 * World-Class Security: API Key Protection
 * 
 * Policy-Driven Security: Uses explicit route policies from route-policies.ts
 * All bypass decisions are logged for audit compliance.
 * 
 * Security Principle: Fail-Closed
 * - Only explicitly allowlisted routes bypass validation
 * - Unknown routes require valid API key
 */
export const apiKeyMiddleware = async (c: Context, next: () => Promise<void>) => {
    const path = c.req.path;
    const method = c.req.method;
    const ip = c.req.header('x-forwarded-for') || 'unknown';

    // Create fingerprint for anomaly detection
    const fingerprint = createRequestFingerprint(
        ip,
        c.req.header('user-agent'),
        path,
        method,
        {
            origin: c.req.header('origin') || c.req.header('Origin'),
            referer: c.req.header('referer'),
            requestedWith: c.req.header('x-requested-with')
        }
    );
    logRequestFingerprint(fingerprint);

    // 1. Mandatory Bypass: Preflights (Safe/Required for CORS)
    if (method === 'OPTIONS') {
        await next();
        return;
    }

    // 2. Policy-Driven Bypass: Check route policies (with audit logging)
    if (checkApiKeyBypass(path, method, ip)) {
        await next();
        return;
    }

    // 3. Timing-Safe API Key Validation
    const apiKey = c.req.header('x-api-key');
    const validKey = process.env.X_API_KEY;

    if (!validKey) {
        logSecurityViolation('API_KEY_NOT_CONFIGURED', { path, ip });
        return sendError(c, 'API security misconfigured', 500);
    }

    // Protection against timing attacks: Use constant-time comparison
    const keyBuffer = Buffer.from(apiKey || '');
    const validBuffer = Buffer.from(validKey);

    let isKeyValid = false;
    try {
        if (apiKey && apiKey.length === validKey.length) {
            isKeyValid = crypto.timingSafeEqual(keyBuffer, validBuffer);
        }
    } catch (e) {
        isKeyValid = false;
    }

    if (!isKeyValid) {
        const origin = c.req.header('origin') || c.req.header('Origin');

        logSecurityViolation('INVALID_API_KEY', {
            path,
            ip,
            hasKey: !!apiKey,
            keyPrefix: apiKey ? apiKey.substring(0, 4) + '...' : 'none',
        });

        return c.json(
            { success: false, error: 'Unauthorized: Invalid API Key' },
            401,
            CORS_HEADERS(origin)
        );
    }

    await next();
};
