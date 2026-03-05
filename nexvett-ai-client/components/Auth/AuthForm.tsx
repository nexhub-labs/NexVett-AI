import { useState } from 'react';
import { Button, Paper, Text, Title, Stack } from '@mantine/core';
import { useAuth } from '../../contexts/AuthContext';
import { navigate } from 'vike/client/router';

export function AuthForm() {
    useAuth();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [authError] = useState<string | null>(null);

    const SERVER_URL = import.meta.env.VITE_NEXVETT_SERVER_URL || '';

    // Capture the redirect URL from query params
    const getRedirectUrl = () => {
        if (typeof window === 'undefined') return '/';
        const params = new URLSearchParams(window.location.search);
        return params.get('redirect') || '/';
    };

    return (
        <Paper withBorder shadow="md" p={40} radius="md">
            <Stack gap="xl">
                <Title order={1} ta="center" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '2rem' }}>
                    Welcome to NexVett AI
                </Title>

                <Text size="sm" ta="center" c="dimmed" style={{ maxWidth: 320, margin: '0 auto' }}>
                    Secure, GDPR-compliant bank statement intelligence.
                </Text>

                {authError && (
                    <Text c="red" size="sm" ta="center">
                        {authError}
                    </Text>
                )}

                <Button
                    fullWidth
                    size="lg"
                    variant="outline"
                    color="gray"
                    loading={googleLoading}
                    onClick={() => {
                        setGoogleLoading(true);
                        const redirectPath = getRedirectUrl();
                        window.location.href = `${SERVER_URL}/api/auth/google?redirect=${encodeURIComponent(redirectPath)}`;
                    }}
                    leftSection={
                        !googleLoading && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )
                    }
                >
                    Continue with Google
                </Button>

                <Text size="xs" ta="center" c="dimmed">
                    By continuing, you agree to our{' '}
                    <Text span component="a" href="/terms" c="violet.4" inherit style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                        Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text span component="a" href="/privacy" c="violet.4" inherit style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                        Privacy Policy
                    </Text>.
                </Text>
            </Stack>
        </Paper>
    );
}
