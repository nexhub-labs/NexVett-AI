/**
 * Security Audit Logger
 * 
 * Dedicated logging for security-related events.
 * Provides structured logging for compliance, forensics, and anomaly detection.
 * 
 * Security Principle: Full Audit Trail
 * - Every security decision is logged
 * - Structured data for automated analysis
 * - Severity levels for alerting
 */

import { logger } from './lib/logger';
import * as fs from 'fs';
import * as path from 'path';

// --- File Logging Setup ---
const LOG_DIR = path.join(process.cwd(), 'logs');
const AUDIT_LOG_FILE = path.join(LOG_DIR, 'security-audit.jsonl');

// Ensure directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create a high-performance append stream
const auditStream = fs.createWriteStream(AUDIT_LOG_FILE, { flags: 'a', encoding: 'utf8' });

/**
 * Persist an event to the security audit file
 */
function persistEvent(event: SecurityEvent) {
    try {
        const line = JSON.stringify(event) + '\n';
        auditStream.write(line);
    } catch (err) {
        // Fallback to console logger if file persistence fails
        logger.error('[SECURITY_PERSISTENCE_ERROR]:', { error: err, event });
    }
}

/**
 * Security event severity levels
 */
export type SecuritySeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

/**
 * Structured security event
 */
export interface SecurityEvent {
    readonly type: string;
    readonly severity: SecuritySeverity;
    readonly timestamp: number;
    readonly context: Record<string, unknown>;
}

/**
 * Log a security decision (bypass, allow, etc.)
 * Severity: INFO - normal security flow
 */
export function logSecurityDecision(
    decision: string,
    context: Record<string, unknown>
): void {
    const event: SecurityEvent = {
        type: `SECURITY_DECISION:${decision}`,
        severity: 'INFO',
        timestamp: Date.now(),
        context,
    };

    // Debug level - fires on every allowlisted request, too noisy for INFO
    logger.debug(`[SECURITY] ${decision}:`, context);
    persistEvent(event);
}

/**
 * Log a security warning (suspicious but not blocked)
 * Severity: WARN - requires attention
 */
export function logSecurityWarning(
    warning: string,
    context: Record<string, unknown>
): void {
    const event: SecurityEvent = {
        type: `SECURITY_WARNING:${warning}`,
        severity: 'WARN',
        timestamp: Date.now(),
        context,
    };

    logger.warn(`[SECURITY_WARN] ${warning}:`, context);
    persistEvent(event);
}

/**
 * Log a security violation (blocked request)
 * Severity: ERROR - potential attack
 */
export function logSecurityViolation(
    violation: string,
    context: Record<string, unknown>
): void {
    const event: SecurityEvent = {
        type: `SECURITY_VIOLATION:${violation}`,
        severity: 'ERROR',
        timestamp: Date.now(),
        context,
    };

    logger.error(`[SECURITY_VIOLATION] ${violation}:`, context);
    persistEvent(event);
}

/**
 * Log a critical security event (breach attempt, etc.)
 * Severity: CRITICAL - immediate investigation required
 */
export function logSecurityCritical(
    event: string,
    context: Record<string, unknown>
): void {
    const securityEvent: SecurityEvent = {
        type: `SECURITY_CRITICAL:${event}`,
        severity: 'CRITICAL',
        timestamp: Date.now(),
        context,
    };

    logger.error(`[SECURITY_CRITICAL] ${event}:`, {
        ...context,
        _severity: 'CRITICAL',
        _requiresInvestigation: true,
    });
    persistEvent(securityEvent);
}

/**
 * Create a request fingerprint for anomaly detection
 */
export function createRequestFingerprint(
    ip: string,
    userAgent: string | undefined,
    path: string,
    method: string,
    headers: {
        origin?: string;
        referer?: string;
        requestedWith?: string;
    } = {}
): Record<string, unknown> {
    return {
        ip,
        userAgent: userAgent || 'unknown',
        path,
        method,
        origin: headers.origin || 'none',
        referer: headers.referer || 'none',
        requestedWith: headers.requestedWith || 'none',
        timestamp: Date.now(),
        // Hash could be added here for deduplication in a log aggregator
    };
}

/**
 * Log request fingerprint for anomaly detection
 * Can be used to detect patterns across requests
 */
export function logRequestFingerprint(
    fingerprint: Record<string, unknown>
): void {
    // Fingerprints are written to the audit file for anomaly detection
    // but suppressed from console (debug level) to avoid log spam.
    logger.debug('[SECURITY_FINGERPRINT]:', fingerprint);
    persistEvent({
        type: 'SECURITY_FINGERPRINT',
        severity: 'INFO',
        timestamp: Date.now(),
        context: fingerprint,
    });
}
