import { SharedUser, SharedSession } from '@nexvett-ai/shared'
import type { PageContext } from 'vike/types'
import { logger } from '../lib/logger'
import { apiClient } from '../lib/api-client'

/**
 * Unified session fetcher for both SSR and Client-side navigation.
 */
export async function fetchSession(pageContext: PageContext): Promise<SharedUser | null> {
    // If user is already in pageContext, return it
    if (pageContext.user) return pageContext.user

    try {
        const isServer = typeof window === 'undefined'
        let cookie: string | undefined

        if (isServer) {
            const headers = pageContext.headers
            cookie = headers?.cookie ?? headers?.Cookie
            if (!cookie && headers) {
                const cookieKey = Object.keys(headers).find(key => key.toLowerCase() === 'cookie')
                if (cookieKey) cookie = headers[cookieKey]
            }
        }

        const data = await apiClient.get<SharedSession>('/api/auth/session', {
            headers: isServer && cookie ? { cookie } : {}
        });

        return data.user;
    } catch (err) {
        logger.error('FETCH_SESSION_FAILED:', err)
        return null
    }
}
