import { useState, useRef, useEffect } from "react";
import { Box, Stack, Paper, Group, Text, ScrollArea, Divider, TextInput, ActionIcon, Badge, Title, Alert, CopyButton, Tooltip } from "@mantine/core";
import { Send, Clock, Calendar, Copy, Check, Share } from "lucide-react";
import MarkdownMessage from "../MarkdownMessage";
import { useAIAssistant } from "../../hooks/useAIAssistant";

interface ChatInterfaceProps {
    showHero?: boolean;
}

export function ChatInterface({ showHero = false }: ChatInterfaceProps) {
    const [input, setInput] = useState("");
    const { messages, sendMessage, isStreaming, error, setError } = useAIAssistant();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;
        sendMessage(input);
        setInput("");
    };

    const hasMessages = messages.filter((m) => m.role !== "system").length > 0;

    return (
        <Stack gap={0} style={{ flex: 1, minHeight: 0, height: "100%" }}>
            {showHero && !hasMessages && (
                <Group justify="space-between" align="center" wrap="wrap" pb="xl" mb="md" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <Box>
                        <Badge variant="light" color="violet" radius="xl" mb={8}>
                            AI Insights
                        </Badge>
                        <Title order={2} style={{ letterSpacing: "-0.04em", fontWeight: 800, fontSize: "2rem" }}>
                            Chat with <Text span c="violet.5" inherit>NexVett AI</Text>
                        </Title>
                    </Box>
                </Group>
            )}

            <Paper
                radius={hasMessages ? "0px" : "24px"}
                style={{
                    background: hasMessages ? "transparent" : "rgba(255,255,255,0.015)",
                    border: hasMessages ? "none" : "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                }}
            >
                {error && (
                    <Box p="md">
                        <Alert color="red" title="Chat error" withCloseButton onClose={() => setError("")}>
                            {error}
                        </Alert>
                    </Box>
                )}

                <ScrollArea flex={1} p="md" scrollbars="y" type="auto" viewportRef={scrollAreaRef}>
                    {!hasMessages ? (
                        <Box h="100%" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Text c="dimmed" ta="center" size="sm">
                                Start by asking a question about your statement.
                            </Text>
                        </Box>
                    ) : (
                        <Stack gap="sm">
                            {messages
                                .filter((m) => m.role !== "system")
                                .map((m) => (
                                    <Box key={m.id} style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: m.role === "user" ? "flex-end" : "flex-start",
                                        padding: "4px 0"
                                    }}>
                                        <Paper
                                            radius="16px"
                                            p="sm"
                                            style={{
                                                maxWidth: "85%",
                                                background: m.role === "user" ? "rgba(124, 58, 237, 0.12)" : "rgba(255,255,255,0.03)",
                                                border: `1px solid ${m.role === "user" ? "rgba(124, 58, 237, 0.2)" : "rgba(255,255,255,0.06)"}`,
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                position: "relative"
                                            }}
                                        >
                                            <Group justify="space-between" align="center" mb={4}>
                                                <Text fw={800} size="xs" tt="uppercase" c={m.role === "user" ? "violet.4" : "dimmed"} style={{ letterSpacing: "0.05em" }}>
                                                    {m.role === "user" ? "You" : "NexVett AI"}
                                                </Text>
                                                {m.createdAt && (
                                                    <Group gap={4} opacity={0.7}>
                                                        <Clock size={10} />
                                                        <Text size="10px" c="dimmed">
                                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Text>
                                                    </Group>
                                                )}
                                            </Group>

                                            <Box style={{ position: "relative" }}>
                                                {m.role === "user" ? (
                                                    <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                                        {m.content}
                                                    </Text>
                                                ) : (
                                                    <MarkdownMessage content={m.content} role="assistant" />
                                                )}

                                                {!isStreaming && m.content && (
                                                    <Group gap={8} justify="flex-end" mt={8}>
                                                        <CopyButton value={m.content} timeout={2000}>
                                                            {({ copied, copy }) => (
                                                                <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="bottom" color="dark">
                                                                    <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy} size="sm">
                                                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                                                    </ActionIcon>
                                                                </Tooltip>
                                                            )}
                                                        </CopyButton>
                                                    </Group>
                                                )}
                                            </Box>
                                        </Paper>
                                    </Box>
                                ))}
                            <div ref={messagesEndRef} />
                        </Stack>
                    )}
                </ScrollArea>

                <Divider opacity={0.6} />

                <form onSubmit={handleSubmit} style={{ padding: "16px" }}>
                    <Paper
                        radius="xl"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            overflow: "hidden"
                        }}
                    >
                        <Group gap="0" align="center">
                            <TextInput
                                flex={1}
                                variant="unstyled"
                                value={input}
                                onChange={(e) => setInput(e.currentTarget.value)}
                                placeholder="Message NexVett AI..."
                                disabled={isStreaming}
                                style={{ paddingLeft: 20 }}
                                styles={{ input: { height: 56, color: "white" } }}
                            />
                            <ActionIcon
                                type="submit"
                                disabled={!input.trim() || isStreaming}
                                loading={isStreaming}
                                radius="xl"
                                size={44}
                                mr={8}
                                variant="gradient"
                                gradient={{ from: 'violet', to: 'pink', deg: 135 }}
                            >
                                <Send size={20} />
                            </ActionIcon>
                        </Group>
                    </Paper>
                </form>
            </Paper>
        </Stack>
    );
}
