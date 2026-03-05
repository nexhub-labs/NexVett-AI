import { SharedUser } from '@nexvett-ai/shared'

declare global {
    namespace Vike {
        interface PageContext {
            user: SharedUser | null
            headers?: Record<string, string | undefined> & {
                cookie?: string
                Cookie?: string
            }
            headersResponse?: {
                set(name: string, value: string): void
                append(name: string, value: string): void
            }
        }
    }

    interface Window {
        dataLayer: any[];
        gtag: (...args: any[]) => void;
    }
}

// Ensure this file is treated as a module
export { }
