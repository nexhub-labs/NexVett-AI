import type { PageContext } from 'vike/types'
import { fetchSession } from './auth'

/**
 * Global guard that fetches the user session before any page-specific guards or rendering.
 * This ensures pageContext.user is populated for both SSR and client-side navigation.
 */
export async function guard(pageContext: PageContext) {
    pageContext.user = await fetchSession(pageContext)
}
