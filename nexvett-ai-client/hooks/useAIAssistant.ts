import { useState, useRef } from "react";
import { useSession } from "../contexts/SessionContext";
import { logger } from "../lib/logger";

import { Message } from "@nexvett-ai/shared";
import { apiClient } from "../lib/api-client";

export function useAIAssistant() {
    const { messages, setMessages, analysisContext } = useSession();
    const [error, setError] = useState<string>("");
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = async (userMessage: string) => {
        if (!userMessage.trim() || isStreaming) return;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: userMessage,
            createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setIsStreaming(true);
        setError("");

        const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "",
            createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        try {
            abortControllerRef.current = new AbortController();

            const messagesToSend: Array<{ role: string; content: string }> = [];

            // Add analysis context if available
            if (analysisContext) {
                messagesToSend.push({
                    role: "system",
                    content: `You are a financial analysis assistant. Here is the user's financial data:\n\n${analysisContext}\n\nUse this data to provide specific, actionable insights. Reference actual numbers from the data when answering questions.`
                });
            }

            // Add conversation history
            const history = messages.concat(userMsg)
                .filter((m) => !(m.role === "assistant" && !m.content.trim()))
                .map((m) => ({ role: m.role, content: m.content }));

            messagesToSend.push(...history);

            // Using the centralized API client's streaming capability
            const response = await apiClient.stream("/api/agents/accountingAgent/stream", {
                messages: messagesToSend
            }, {
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`Agent error: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No response body");

            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") continue;

                        try {
                            const parsed = JSON.parse(data) as { type: string; payload?: { error?: string; message?: string; textDelta?: string; text?: string; delta?: string } };
                            if (parsed.type === "error") {
                                setError(parsed.payload?.error || parsed.payload?.message || "Agent error occurred");
                                continue;
                            }

                            if (parsed.type === "text-delta") {
                                const textDelta = parsed.payload?.textDelta || parsed.payload?.text || parsed.payload?.delta;
                                if (textDelta) {
                                    setMessages((prev) => {
                                        const updated = [...prev];
                                        const lastIndex = updated.length - 1;
                                        if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
                                            updated[lastIndex] = {
                                                ...updated[lastIndex],
                                                content: updated[lastIndex].content + textDelta,
                                            };
                                        }
                                        return updated;
                                    });
                                }
                            }
                        } catch (e) {
                            logger.warn("Failed to parse SSE data", e);
                        }
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") {
                logger.info("Request aborted");
            } else {
                setError(err instanceof Error ? err.message : "An error occurred");
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const stopStreaming = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    return {
        messages,
        sendMessage,
        stopStreaming,
        isStreaming,
        error,
        setError
    };
}
