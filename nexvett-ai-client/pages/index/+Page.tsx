import { Badge, Box, Button, Divider, Grid, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { ShieldCheck, Search, Brain } from "lucide-react";
import { useReducedMotion } from "@mantine/hooks";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { navigate } from "vike/client/router";

gsap.registerPlugin(useGSAP);

function HomeContent({ rootRef }: { rootRef?: React.Ref<HTMLDivElement> }) {
  return (
    <Box
      id="home"
      ref={rootRef}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        data-spotlight
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <Box
          data-spot
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              "radial-gradient(circle at center, rgba(124,58,237,0.28), rgba(236,72,153,0.16), transparent 62%)",
            filter: "blur(10px)",
            transform: "translate(-260px, -260px)",
            opacity: 0.0,
          }}
        />
      </Box>

      <Stack gap={34}>
        <Group gap="xs" wrap="wrap">
          <Badge data-anim="chip" variant="light" color="violet" radius="xl">
            Privacy-first
          </Badge>
          <Badge data-anim="chip" variant="light" color="gray" radius="xl">
            Nigerian banking
          </Badge>
          <Badge data-anim="chip" variant="light" color="gray" radius="xl">
            In-memory analysis
          </Badge>
        </Group>

        <Grid gutter={{ base: "lg", sm: 56 }} align="start">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Title
              data-anim="hero"
              order={1}
              style={{
                letterSpacing: "-0.04em",
                fontWeight: 800,
                lineHeight: 1.05,
                maxWidth: 900,
                fontSize: "clamp(3rem, 8vw, 5rem)",
              }}
            >
              Clarity for your bank statement.
              <br />
              <Text span c="violet.5" inherit style={{
                background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                Designed to leave no trace.
              </Text>
            </Title>

            <Text data-anim="hero" c="dimmed" size="lg" mt={16} style={{ maxWidth: 680, lineHeight: 1.7 }}>
              Fee audits, category breakdowns, anomalies, and patterns—fast. Your data isn’t stored; it’s processed and discarded.
            </Text>

            <Group data-anim="hero" gap="sm" wrap="wrap" mt={18}>
              <Button onClick={() => navigate("/analyze")} size="md" radius="xl">
                Start analysis
              </Button>
              <Button component="a" href="#signal" variant="default" size="md" radius="xl">
                See the signal
              </Button>
            </Group>

            <Group data-anim="hero" gap="lg" mt={{ base: 22, sm: 26 }} wrap="wrap">
              <Stack gap={2}>
                <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
                  Built for
                </Text>
                <Text fw={650} style={{ letterSpacing: "-0.02em" }}>
                  Nigerian statements
                </Text>
              </Stack>
              <Box style={{ width: 1, height: 30, background: "rgba(0,0,0,0.08)" }} />
              <Stack gap={2}>
                <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
                  Output
                </Text>
                <Text fw={650} style={{ letterSpacing: "-0.02em" }}>
                  Explainable insights
                </Text>
              </Stack>
              <Box style={{ width: 1, height: 30, background: "rgba(0,0,0,0.08)" }} />
              <Stack gap={2}>
                <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
                  Privacy
                </Text>
                <Text fw={650} style={{ letterSpacing: "-0.02em" }}>
                  In-memory only
                </Text>
              </Stack>
            </Group>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper
              data-anim="panel"
              radius="xl"
              p={{ base: "lg", sm: 28 }}
              style={{
                boxShadow: "0 18px 70px rgba(0,0,0,0.55)",
                position: "relative",
              }}
            >
              <Box
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 22,
                  pointerEvents: "none",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              />
              <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.2em", fontWeight: 700 }}>
                Signal deck
              </Text>
              <Title order={3} mt={12} style={{ letterSpacing: "-0.02em", lineHeight: 1.2, fontWeight: 750 }}>
                What you’ll see
              </Title>
              <Text mt={12} c="dimmed" size="md" style={{ lineHeight: 1.7 }}>
                Net flow, hidden fees, top categories, and unusual activity—distilled into actionable patterns.
              </Text>

              <Divider my="lg" opacity={0.6} />

              <Stack gap={10}>
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={650} style={{ letterSpacing: "-0.01em" }}>
                    Hidden fees
                  </Text>
                  <Text size="sm" c="dimmed">
                    audit
                  </Text>
                </Group>
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={650} style={{ letterSpacing: "-0.01em" }}>
                    Category split
                  </Text>
                  <Text size="sm" c="dimmed">
                    clarity
                  </Text>
                </Group>
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={650} style={{ letterSpacing: "-0.01em" }}>
                    Anomalies
                  </Text>
                  <Text size="sm" c="dimmed">
                    focus
                  </Text>
                </Group>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        <Paper
          id="signal"
          data-anim="panel"
          radius="xl"
          p={{ base: "xl", sm: 48 }}
          style={{
            position: "relative",
            background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <Grid gutter={40} align="stretch">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Stack gap={16}>
                <Box style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(124, 58, 237, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={22} color="#8b5cf6" />
                </Box>
                <Box>
                  <Text fw={750} size="lg" style={{ letterSpacing: "-0.01em" }}>
                    Zero storage
                  </Text>
                  <Text c="dimmed" size="sm" mt={8} style={{ lineHeight: 1.7 }}>
                    Analyzed in-memory. Nothing is stored on our servers. Your privacy is baked into the architecture.
                  </Text>
                </Box>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Stack gap={16}>
                <Box style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(236, 72, 153, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Search size={22} color="#ec4899" />
                </Box>
                <Box>
                  <Text fw={750} size="lg" style={{ letterSpacing: "-0.01em" }}>
                    Fee audit
                  </Text>
                  <Text c="dimmed" size="sm" mt={8} style={{ lineHeight: 1.7 }}>
                    Surface hidden platform fees and recurring charges that bleed your balance over time.
                  </Text>
                </Box>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Stack gap={16}>
                <Box style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(14, 165, 233, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Brain size={22} color="#0ea5e9" />
                </Box>
                <Box>
                  <Text fw={750} size="lg" style={{ letterSpacing: "-0.01em" }}>
                    Smart Insights
                  </Text>
                  <Text c="dimmed" size="sm" mt={8} style={{ lineHeight: 1.7 }}>
                    Get clear, human-readable breakdowns of where your money actually goes.
                  </Text>
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
        </Paper>

        <Grid gutter={{ base: "lg", sm: 56 }} align="start">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Title
              data-anim="panel"
              order={2}
              style={{
                letterSpacing: "-0.06em",
                lineHeight: 1.02,
                fontWeight: 750,
              }}
            >
              Your statement,
              <br />
              distilled into decisions.
            </Title>
            <Text data-anim="panel" c="dimmed" mt={14} style={{ lineHeight: 1.8, maxWidth: 720 }}>
              A minimalist interface that prioritizes signal. Fees surface. Patterns emerge. Outliers stand out. The rest fades away.
            </Text>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper
              data-anim="panel"
              radius="xl"
              p={{ base: "lg", sm: 28 }}
              style={{
                position: "relative",
              }}
            >
              <Box
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 22,
                  pointerEvents: "none",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              />
              <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
                Built on restraint
              </Text>
              <Text mt={10} fw={700} style={{ letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                Less interface.
                <br />
                More truth.
              </Text>
              <Text mt={10} c="dimmed" style={{ lineHeight: 1.75 }}>
                We don’t decorate your finances. We reveal them.
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>

        <Paper
          data-anim="panel"
          radius="24px"
          p={{ base: "xl", sm: 64 }}
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(236,72,153,0.05) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center"
          }}
        >
          <Box
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.15), transparent 70%)",
              pointerEvents: "none"
            }}
          />
          <Stack gap={24} align="center" style={{ position: "relative", zIndex: 1, maxWidth: 640 }}>
            <Text size="xs" tt="uppercase" style={{ letterSpacing: "0.3em", fontWeight: 750, color: "#8b5cf6" }}>
              Get Started
            </Text>
            <Title fw={800} style={{ letterSpacing: "-0.04em", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.1 }}>
              Ready to reveal the <br />
              truth in your data?
            </Title>
            <Text size="lg" c="dimmed" style={{ lineHeight: 1.7 }}>
              Upload your Nigeria bank statement and get instant clarity. Zero storage, zero trace, total signal.
            </Text>
            <Button onClick={() => navigate("/analyze")} size="xl" radius="xl" color="violet" mt={12} style={{ height: 60, paddingLeft: 40, paddingRight: 40 }}>
              Start your analysis
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

function HomeAnimated() {
  const reducedMotion = useReducedMotion();
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;

      const q = gsap.utils.selector(scope);

      const spot = q("[data-spot]")[0] as HTMLElement | undefined;
      const spotlight = q("[data-spotlight]")[0] as HTMLElement | undefined;

      let cleanupSpotlight: (() => void) | undefined;

      gsap.set(q("[data-anim='hero']"), { opacity: 0, y: 14 });
      gsap.set(q("[data-anim='chip']"), { opacity: 0, y: 10 });
      gsap.set(q("[data-anim='panel']"), { opacity: 0, y: 18 });

      if (spot && spotlight) {
        gsap.set(spot, { opacity: 0, scale: 0.8 });
        const xTo = gsap.quickTo(spot, "x", { duration: 0.8, ease: "power3.out" });
        const yTo = gsap.quickTo(spot, "y", { duration: 0.8, ease: "power3.out" });

        const onMove = (e: PointerEvent) => {
          const rect = spotlight.getBoundingClientRect();
          xTo(e.clientX - rect.left);
          yTo(e.clientY - rect.top);
        };

        const onEnter = () => gsap.to(spot, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.7)" });
        const onLeave = () => gsap.to(spot, { opacity: 0, scale: 0.8, duration: 0.45, ease: "power2.in" });

        spotlight.addEventListener("pointermove", onMove);
        spotlight.addEventListener("pointerenter", onEnter);
        spotlight.addEventListener("pointerleave", onLeave);

        cleanupSpotlight = () => {
          spotlight.removeEventListener("pointermove", onMove);
          spotlight.removeEventListener("pointerenter", onEnter);
          spotlight.removeEventListener("pointerleave", onLeave);
        };
      }

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.to(q("[data-anim='chip']"), {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(1.7)"
      }, 0.1)
        .to(q("[data-anim='hero']"), {
          opacity: 1,
          y: 0,
          duration: 1.2,
          stagger: 0.15,
          clearProps: "transform,opacity"
        }, 0.2)
        .to(q("[data-anim='panel']"), {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.2,
          ease: "power4.out"
        }, 0.4);


      return () => {
        cleanupSpotlight?.();
      };
    },
    { scope }
  );

  return <HomeContent rootRef={scope} />;
}

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <HomeContent />;
  return <HomeAnimated />;
}
