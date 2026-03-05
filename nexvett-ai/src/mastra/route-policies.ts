/**
 * Route Security Policies - Single Source of Truth
 * 
 * This file defines explicit security policies for all API routes.
 * Every bypass is documented with a reason for audit compliance.
 * 
 * Security Principle: Explicit Allowlisting (Fail-Closed)
 * - Only routes explicitly listed here can bypass security layers
 * - Unknown routes default to maximum security enforcement
 */

import { logSecurityDecision } from './security-logger';
import { logger } from './lib/logger';

/**
 * Route policy types with explicit reasons for audit trail
 */
export interface RoutePolicy {
    readonly path: string;
    readonly methods: readonly string[];
    readonly reason: string;
}

/**
 * Security layer bypass configuration
 * Each category represents a specific security context
 */
export const ROUTE_POLICIES = {
    /**
     * Public routes: No API key, no auth required
     * Use sparingly - only for truly public endpoints
     */
    public: [
        {
            path: '/api/health-check',
            methods: ['GET'],
            reason: 'Monitoring/uptime checks - must be accessible without authentication'
        },
    ] as const satisfies readonly RoutePolicy[],

    /**
     * OAuth routes: Browser-initiated, no API key possible
     * These routes are called directly by browser navigation or OAuth provider redirects
     */
    oauth: [
        {
            path: '/api/auth/google',
            methods: ['GET'],
            reason: 'OAuth initiation - browser navigates directly, cannot include API key header'
        },
        {
            path: '/api/auth/callback',
            methods: ['GET'],
            reason: 'OAuth callback - Google redirects here, cannot include API key header'
        },
    ] as const satisfies readonly RoutePolicy[],

    /**
     * Session routes: Cookie-based authentication, no API key needed
     * These handle session management and are protected by cookies
     */
    session: [
        {
            path: '/api/auth/session',
            methods: ['GET'],
            reason: 'Session check - read-only, uses HTTP-only cookies for security'
        },
        {
            path: '/api/auth/logout',
            methods: ['POST'],
            reason: 'Session termination - clears current session only, protected by CSRF'
        },
        {
            path: '/api/account/history',
            methods: ['GET'],
            reason: 'Account data - session-based retrieval for authenticated users'
        },
        {
            path: '/api/account/profile',
            methods: ['GET', 'PUT'],
            reason: 'Profile management - session-based access for authenticated users'
        },
    ] as const satisfies readonly RoutePolicy[],
} as const;

/**
 * All routes that bypass API key validation
 * Computed once at startup for performance
 */
const API_KEY_BYPASS_PATHS = new Set<string>([
    ...ROUTE_POLICIES.public.map(r => r.path),
    ...ROUTE_POLICIES.oauth.map(r => r.path),
    ...ROUTE_POLICIES.session.map(r => r.path),
]);

/**
 * All routes that bypass authentication
 */
const AUTH_BYPASS_PATHS = new Set<string>([
    ...ROUTE_POLICIES.public.map(r => r.path),
    ...ROUTE_POLICIES.oauth.map(r => r.path),
    ...ROUTE_POLICIES.session.map(r => r.path),
]);

/**
 * Find the policy for a given route
 */
function findPolicy(path: string): RoutePolicy | null {
    // Strip query params and normalize trailing slash
    let cleanPath = path.split('?')[0];
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
        cleanPath = cleanPath.slice(0, -1);
    }

    const allPolicies = [
        ...ROUTE_POLICIES.public,
        ...ROUTE_POLICIES.oauth,
        ...ROUTE_POLICIES.session,
    ];

    const matchingPolicy = allPolicies.find(p => p.path === cleanPath);

    logger.debug(`[POLICY] Route Check`, {
        inputPath: path,
        normalizedPath: cleanPath,
        matchFound: !!matchingPolicy
    });

    if (matchingPolicy) {
        logger.debug(`[POLICY] Match Details`, {
            policyPath: matchingPolicy.path,
            methods: matchingPolicy.methods
        });
    }

    return matchingPolicy || null;
}

/**
 * Check if a path should bypass API key validation
 * Returns the reason if bypassed, null otherwise
 */
export function shouldBypassApiKey(path: string, method: string): { bypass: boolean; reason: string | null } {
    let cleanPath = path.split('?')[0];
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
        cleanPath = cleanPath.slice(0, -1);
    }

    // Check internal dev routes (only in non-production)
    if (process.env.NODE_ENV !== 'production') {
        if (cleanPath.startsWith('/__') || cleanPath === '/refresh-events') {
            return { bypass: true, reason: 'Internal Mastra dev route (non-production only)' };
        }
    }

    const policy = findPolicy(cleanPath);
    if (policy && policy.methods.includes(method)) {
        return { bypass: true, reason: policy.reason };
    }

    // Path matches but method doesn't - still require API key
    return { bypass: false, reason: null };
}

/**
 * Check if a path should bypass authentication
 * Returns the reason if bypassed, null otherwise
 */
export function shouldBypassAuth(path: string, method: string): { bypass: boolean; reason: string | null } {
    let cleanPath = path.split('?')[0];
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
        cleanPath = cleanPath.slice(0, -1);
    }

    const policy = findPolicy(cleanPath);
    if (policy && policy.methods.includes(method)) {
        return { bypass: true, reason: policy.reason };
    }

    return { bypass: false, reason: null };
}

/**
 * Get the security classification for a route
 */
export function getRouteClassification(path: string): 'public' | 'oauth' | 'session' | 'protected' {
    const cleanPath = path.split('?')[0];

    if (ROUTE_POLICIES.public.some(p => p.path === cleanPath)) return 'public';
    if (ROUTE_POLICIES.oauth.some(p => p.path === cleanPath)) return 'oauth';
    if (ROUTE_POLICIES.session.some(p => p.path === cleanPath)) return 'session';

    return 'protected';
}

/**
 * Log and check API key bypass decision
 * Combines policy check with audit logging
 */
export function checkApiKeyBypass(path: string, method: string, ip: string): boolean {
    const { bypass, reason } = shouldBypassApiKey(path, method);

    if (bypass) {
        logSecurityDecision('API_KEY_BYPASS', {
            path,
            method,
            ip,
            reason,
            classification: getRouteClassification(path),
        });
    }

    return bypass;
}

/**
 * Log and check auth bypass decision
 * Combines policy check with audit logging
 */
export function checkAuthBypass(path: string, method: string, ip: string): boolean {
    const { bypass, reason } = shouldBypassAuth(path, method);

    if (bypass) {
        logSecurityDecision('AUTH_BYPASS', {
            path,
            method,
            ip,
            reason,
            classification: getRouteClassification(path),
        });
    }

    return bypass;
}
