import { secureHeaders } from 'hono/secure-headers';
import {
    authMiddleware,
    corsMiddleware,
    csrfProtection,
    rateLimiter,
    CORS_ORIGIN,
    CORS_HEADERS,
    sendError,
    sendJson,
    apiKeyMiddleware
} from './middleware';

/**
 * World-Class Security: Centralized Security Engine
 * Consolidates all security layers into a modular, reusable pipeline.
 */

// 1. Base Security Headers (HSTS, CSP, etc.)
// Validate critical env vars for CSP
const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) throw new Error('SUPABASE_URL is required for CSP configuration');

// 1. Base Security Headers (HSTS, CSP, etc.)
export const baseHeaders = secureHeaders({
    contentSecurityPolicy: {
        // Strict API Security: By default, block all content sources.
        // APIs return JSON/Data, which should never execute scripts or load external resources.
        // This neutralizes XSS vectors even if an error page accidentally renders HTML.
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
    },
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
});

// 2. Global Security Pipeline (Applied to all routes)
export const globalSecurity = [
    corsMiddleware,
    apiKeyMiddleware,
    baseHeaders,
    csrfProtection,
];

// 3. Protected Route Pipeline (Auth + Global Security)
export const protectedSecurity = [
    ...globalSecurity,
    rateLimiter,
    authMiddleware,
];

// Re-export core utilities for convenience
export {
    authMiddleware,
    csrfProtection,
    rateLimiter,
    CORS_ORIGIN,
    CORS_HEADERS,
    sendError,
    sendJson
};
