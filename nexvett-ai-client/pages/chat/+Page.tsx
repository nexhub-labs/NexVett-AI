import { useEffect, useState } from "react";
import { Box } from "@mantine/core";
import { ChatInterface } from "../../components/Chat/ChatInterface";
import { RequireAuth } from "../../contexts/AuthContext";

function ChatContent() {
    return (
        <Box style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
            <ChatInterface showHero={true} />
        </Box>
    );
}

export default function Page() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <Box style={{ height: "calc(100vh - 120px)" }} />;
    return (
        <RequireAuth>
            <ChatContent />
        </RequireAuth>
    );
}
