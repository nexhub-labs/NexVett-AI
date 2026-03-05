import type { PageContextServer } from 'vike/types'
import { fetchSession } from './auth'

export async function onBeforeRender(pageContext: PageContextServer) {
    // Session is likely already fetched by the global guard, but we ensure it here
    const user = await fetchSession(pageContext)

    return {
        pageContext: {
            user
        }
    }
}
