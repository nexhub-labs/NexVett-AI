/**
 * Sensitive keys that should be masked in logs.
 */
const SENSITIVE_KEYS = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'key',
    'auth',
    'authorization',
    'cookie',
    'set-cookie',
    'code',
    'state',
    'otp',
    'cvv',
    'masterPassword',
];

/**
 * Partial masking for emails to protect privacy while maintaining some context.
 * example@domain.com -> e*****@domain.com
 */
export const maskEmail = (email: string): string => {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return '***';
    }
    const [local, domain] = email.split('@');
    if (local.length <= 1) {
        return `*@${domain}`;
    }
    return `${local[0]}*****@${domain}`;
};

/**
 * Recursively sanitizes an object by masking sensitive keys.
 */
export const sanitize = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data !== 'object') {
        if (typeof data === 'string') {
            // Check for stringified JSON
            if ((data.startsWith('{') && data.endsWith('}')) || (data.startsWith('[') && data.endsWith(']'))) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && typeof parsed === 'object') {
                        return JSON.stringify(sanitize(parsed));
                    }
                } catch {
                    // Not valid JSON, continue
                }
            }

            // Handle strings that look like emails
            if (data.includes('@') && data.includes('.')) {
                return maskEmail(data);
            }
        }
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(sanitize);
    }

    const sanitized: any = {};

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            const lowerKey = key.toLowerCase();

            if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
                sanitized[key] = '***';
            } else if (lowerKey === 'email' && typeof value === 'string') {
                sanitized[key] = maskEmail(value);
            } else {
                sanitized[key] = sanitize(value);
            }
        }
    }

    return sanitized;
};
