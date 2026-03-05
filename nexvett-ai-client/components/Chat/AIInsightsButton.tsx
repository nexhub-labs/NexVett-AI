import { Badge } from "@mantine/core";
import { Sparkles } from "lucide-react";
import { useSession } from "../../contexts/SessionContext";

interface AIInsightsButtonProps {
    initialMessage?: string;
    label?: string;
}

export function AIInsightsButton({ initialMessage, label = "AI Financial Advice" }: AIInsightsButtonProps) {
    const { setIsChatOpen, setMessages, messages } = useSession();

    const handleOpenChat = () => {
        setIsChatOpen(true);

        if (initialMessage && messages.length === 0) {
            // Logic to auto-send initial message if needed can be added here or in useAIAssistant
            // For now, let's just open the chat. 
            // If we wanted to trigger the message, we'd need to coordinate with useAIAssistant
        }
    };

    return (
        <Badge
            component="button"
            onClick={handleOpenChat}
            variant="light"
            color="violet"
            size="lg"
            radius="xl"
            style={{ cursor: 'pointer', border: 'none' }}
            leftSection={<Sparkles size={14} />}
        >
            {label}
        </Badge>
    );
}
