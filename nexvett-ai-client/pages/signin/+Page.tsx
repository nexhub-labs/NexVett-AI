import { Container, Image, Stack, Text, Group, Box } from '@mantine/core';
import { AuthForm } from '../../components/Auth/AuthForm';
import logoUrl from '../../assets/logo.webp';

export default function Page() {
    return (
        <Container size={420} my={40}>
            <Stack gap="xl" align="center">
                <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Group gap="xs" justify="center">
                        <Image src={logoUrl} h={42} w="auto" />
                        <Text fw={900} size="xl" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
                            NexVett <Text span style={{
                                background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent"
                            }}>AI</Text>
                        </Text>
                    </Group>
                </a>
                <AuthForm />
            </Stack>
        </Container>
    );
}
