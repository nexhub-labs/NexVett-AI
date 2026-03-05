import { Modal, Text, Group, Button } from "@mantine/core";
import { ChatInterface } from "./ChatInterface";
import { useSession } from "../../contexts/SessionContext";
import { navigate } from "vike/client/router";

export function AIAssistantModal() {
    const { isChatOpen, setIsChatOpen } = useSession();

    return (
        <Modal
            opened={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            title={<Text fw={700} size="lg">Ask the AI</Text>}
            size="xl"
            centered
            styles={{
                body: { padding: 0, height: "70vh", display: "flex", flexDirection: "column" },
                header: { borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px" }
            }}
        >
            <Group justify="space-between" align="center" p="md" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Text c="dimmed" size="sm">
                    Ask about fees, spending patterns, anomalies, and trends.
                </Text>
                <Button variant="light" radius="xl" size="xs" onClick={() => {
                    setIsChatOpen(false);
                    navigate("/chat");
                }}>
                    Open full chat
                </Button>
            </Group>

            <ChatInterface />
        </Modal>
    );
}
