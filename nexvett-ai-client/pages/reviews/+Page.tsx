import { Badge, Box, Button, Grid, Group, Paper, Stack, Text, Textarea, Title, Rating } from "@mantine/core";
import { Send, User, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "../../contexts/AuthContext";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@mantine/hooks";

gsap.registerPlugin(useGSAP);

function ReviewsContent({ rootRef }: { rootRef?: React.Ref<HTMLDivElement> }) {
    const [rating, setRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    return (
        <Box ref={rootRef} style={{ position: "relative", overflow: "hidden" }}>
            <Stack gap={48} py={40}>
                {/* Hero */}
                <Box>
                    <Badge data-anim="hero" variant="light" color="violet" radius="xl" mb="md">
                        Wall of Love & Feedback
                    </Badge>
                    <Title data-anim="hero" order={1} style={{ letterSpacing: "-0.04em", fontWeight: 800, fontSize: "clamp(2.5rem, 6vw, 4rem)" }}>
                        Your voice helps us <br />
                        <Text span c="violet.5" inherit style={{
                            background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}>build better.</Text>
                    </Title>
                    <Text data-anim="hero" c="dimmed" mt="md" size="lg" style={{ maxWidth: 600, lineHeight: 1.7 }}>
                        We’re committed to absolute privacy and flawless clarity. Share your experience or tell us where we can improve.
                    </Text>
                </Box>

                <Grid gutter={40} align="start">
                    {/* Feedback Form */}
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Paper
                            data-anim="form"
                            radius="24px"
                            p={{ base: "xl", sm: 32 }}
                            style={{
                                background: "rgba(255,255,255,0.015)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
                            }}
                        >
                            {!submitted ? (
                                <Stack gap={24}>
                                    <Box>
                                        <Text fw={700} size="lg" mb={4}>Leave a review</Text>
                                        <Text size="sm" c="dimmed">How was your experience with NexVett AI?</Text>
                                    </Box>

                                    <Box>
                                        <Text size="sm" fw={600} mb={8}>Rating</Text>
                                        <Rating value={rating} onChange={setRating} size="lg" color="violet" />
                                    </Box>

                                    <Textarea
                                        label="Message"
                                        placeholder="Tell us what you think..."
                                        minRows={4}
                                        radius="md"
                                        styles={{
                                            input: {
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                color: "white"
                                            }
                                        }}
                                    />

                                    <Button
                                        size="lg"
                                        radius="xl"
                                        color="violet"
                                        fullWidth
                                        onClick={() => setSubmitted(true)}
                                        leftSection={<Send size={18} />}
                                        style={{ height: 54 }}
                                    >
                                        Submit Feedback
                                    </Button>
                                </Stack>
                            ) : (
                                <Stack align="center" py={40} gap={16}>
                                    <Box style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: "50%",
                                        background: "rgba(139, 92, 246, 0.1)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#8b5cf6"
                                    }}>
                                        <Sparkles size={32} />
                                    </Box>
                                    <Title order={3}>Thank you!</Title>
                                    <Text c="dimmed" ta="center">Your feedback has been received. We appreciate your support in making NexVett AI better.</Text>
                                    <Button variant="subtle" color="gray" radius="xl" onClick={() => setSubmitted(false)}>
                                        Send another
                                    </Button>
                                </Stack>
                            )}
                        </Paper>
                    </Grid.Col>

                    {/* Testimonials Grid */}
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Stack gap="xl">
                            <Text fw={700} size="xl" data-anim="hero">What others are saying</Text>
                            <Grid gutter="md">
                                {[
                                    { name: "Adewale Y.", role: "Business Owner", text: "NexVett AI cleared up months of banking confusion in seconds. The privacy aspect is what sold me.", rating: 5 },
                                    { name: "Chinelo O.", role: "Freelancer", text: "Finally, a way to audit my bank fees without sharing my credentials. Fast and beautifully designed.", rating: 5 },
                                    { name: "Tunde K.", role: "Financial Analyst", text: "The pattern recognition is surprisingly sharp. Great tool for quick audits.", rating: 4 },
                                    { name: "Sarah B.", role: "Savings Enthusiast", text: "I love the zero-trace policy. It makes me feel safe analyzing my personal data.", rating: 5 }
                                ].map((item, i) => (
                                    <Grid.Col span={{ base: 12, sm: 6 }} key={i}>
                                        <Paper
                                            data-anim="card"
                                            radius="xl"
                                            p="lg"
                                            style={{
                                                background: "rgba(255,255,255,0.01)",
                                                border: "1px solid rgba(255,255,255,0.04)",
                                                height: "100%"
                                            }}
                                        >
                                            <Stack gap="sm">
                                                <Rating value={item.rating} readOnly size="xs" color="violet" />
                                                <Text size="sm" style={{ fontStyle: "italic", lineHeight: 1.6 }}>"{item.text}"</Text>
                                                <Group gap="sm" mt="auto">
                                                    <Box style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        <User size={16} opacity={0.5} />
                                                    </Box>
                                                    <Box>
                                                        <Text size="xs" fw={700}>{item.name}</Text>
                                                        <Text size="xs" c="dimmed">{item.role}</Text>
                                                    </Box>
                                                </Group>
                                            </Stack>
                                        </Paper>
                                    </Grid.Col>
                                ))}
                            </Grid>
                        </Stack>
                    </Grid.Col>
                </Grid>
            </Stack>
        </Box>
    );
}

function ReviewsAnimated() {
    const reducedMotion = useReducedMotion();
    const scope = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            if (reducedMotion) return;

            const q = gsap.utils.selector(scope);

            gsap.set(q("[data-anim='hero']"), { opacity: 0, y: 14 });
            gsap.set(q("[data-anim='form']"), { opacity: 0, x: -20 });
            gsap.set(q("[data-anim='card']"), { opacity: 0, y: 20 });

            const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

            tl.to(q("[data-anim='hero']"), {
                opacity: 1,
                y: 0,
                duration: 1,
                stagger: 0.1,
                clearProps: "transform,opacity"
            }, 0.1)
                .to(q("[data-anim='form']"), {
                    opacity: 1,
                    x: 0,
                    duration: 1.2,
                    ease: "power4.out",
                    clearProps: "transform,opacity"
                }, 0.3)
                .to(q("[data-anim='card']"), {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.12,
                    clearProps: "transform,opacity"
                }, 0.5);

        },
        { scope }
    );

    return <ReviewsContent rootRef={scope} />;
}

export default function Page() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <ReviewsContent />;
    return (
        <RequireAuth>
            <ReviewsAnimated />
        </RequireAuth>
    );
}
