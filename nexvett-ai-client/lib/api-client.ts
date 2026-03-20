import { logger } from './logger';

const BACKEND_URL = import.meta.env.VITE_NEXVETT_SERVER_URL || '';

export interface ApiClientOptions extends RequestInit {
    params?: Record<string, string>;
}

/**
 * World-Class Security: Centralized API Client
 * Wraps fetch to ensure all outgoing calls are modularly secured and standardized.
 * Strategy mirrors the robust fetch mechanism used in our AI assistant.
 */
class ApiClient {
    /**
     * Internal base request handler
     */
    private async baseRequest(endpoint: string, options: ApiClientOptions = {}): Promise<Response> {
        const { params, headers, body, ...config } = options;

        // 1. Resolve URL (Prefer relative paths for native CORS/CSRF security)
        let url = endpoint;
        if (endpoint.startsWith('/')) {
            // Browser will use current origin if no base is provided
            // This is safer as it leverages native origin matching
        } else if (!endpoint.startsWith('http')) {
            url = `${BACKEND_URL}/${endpoint}`;
        }

        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `${url.includes('?') ? '&' : '?'}${searchParams.toString()}`;
        }

        // 2. Standardize Security Headers (Peak Security Order)
        const securityHeaders: Record<string, string> = {
            'X-Requested-With': 'XMLHttpRequest',
            'X-API-KEY': import.meta.env.VITE_NEXVETT_API_KEY || '',
        };

        // 3. Handle Body and Content-Type
        let finalBody = body;
        let contentType: string | undefined = (headers as Record<string, string> | undefined)?.['Content-Type'];

        if (body && !(body instanceof FormData) && !contentType) {
            finalBody = JSON.stringify(body);
            contentType = 'application/json';
        }

        const finalHeaders = {
            ...securityHeaders,
            ...(contentType ? { 'Content-Type': contentType } : {}),
            ...headers,
        };

        // 4. Execute Fetch
        return fetch(url, {
            ...config,
            body: finalBody,
            headers: finalHeaders,
            credentials: 'include',
        });
    }

    /**
     * Standard JSON request handler
     */
    private async request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
        try {
            const response = await this.baseRequest(endpoint, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            logger.error(`API_CLIENT_ERROR [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Streaming request handler (returns raw Response)
     */
    async stream(endpoint: string, body?: unknown, options: ApiClientOptions = {}): Promise<Response> {
        return this.baseRequest(endpoint, {
            ...options,
            method: 'POST',
            body: body as any,
        });
    }

    get<T>(endpoint: string, options?: ApiClientOptions) {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    post<T>(endpoint: string, body?: unknown, options: ApiClientOptions = {}) {
        return this.request<T>(endpoint, { ...options, method: 'POST', body: body as any });
    }

    put<T>(endpoint: string, body?: unknown, options: ApiClientOptions = {}) {
        return this.request<T>(endpoint, { ...options, method: 'PUT', body: body as any });
    }

    delete<T>(endpoint: string, options?: ApiClientOptions) {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
