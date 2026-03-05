import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SharedUser, SharedSession } from '@nexvett-ai/shared';
import { logger } from '../lib/logger';
import { usePageContext } from 'vike-react/usePageContext';
import { apiClient } from '../lib/api-client';
import { navigate } from 'vike/client/router';

interface AuthContextType {
    session: SharedSession | null;
    user: SharedUser | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const pageContext = usePageContext();
    const [user, setUser] = useState<SharedUser | null>(pageContext.user || null);
    const [loading, setLoading] = useState(!pageContext.user);

    const checkSession = async () => {
        try {
            const data = await apiClient.get<SharedSession>('/api/auth/session');
            setUser(data.user);
        } catch (err) {
            logger.error('Failed to fetch session:', err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // If we already have a user from SSR, we don't need an immediate fetch
        if (!user) {
            checkSession();
        } else {
            setLoading(false);
        }
    }, []);

    const signOut = async () => {
        try {
            await apiClient.post('/api/auth/logout');
            setUser(null);
            navigate('/signin');
        } catch (err) {
            logger.error('Logout failed:', err);
        }
    };

    const value = {
        session: null, // Session object is now managed by backend cookies
        user,
        loading,
        signOut,
        refreshSession: checkSession,
    };

    return <AuthContext.Provider value={value as AuthContextType}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

/**
 * World-Class Security: Protected Route Wrapper
 * Ensures only authenticated users can access children components.
 * Handles redirection on the client side to avoid SSR loops.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            const currentPath = window.location.pathname;
            navigate(`/signin?redirect=${encodeURIComponent(currentPath)}`);
        }
    }, [user, loading]);

    if (loading) {
        // You could return a full-page loader here
        return null;
    }

    if (!user) {
        // Briefly return null while the useEffect triggers navigation
        return null;
    }

    return <>{children}</>;
}
