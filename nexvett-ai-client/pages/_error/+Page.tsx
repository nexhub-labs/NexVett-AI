import { usePageContext } from "vike-react/usePageContext";
import { Box, Button, Container, Stack, Text, Title } from "@mantine/core";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { FloatingBackground } from "../../components/FloatingBackground";
import { MoveLeft } from "lucide-react";

export default function Page() {
  const { is404 } = usePageContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!contentRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.from(titleRef.current, {
      y: 60,
      opacity: 0,
      duration: 1.2,
      skewY: 5,
    })
      .from(".error-code", {
        scale: 1.5,
        opacity: 0,
        duration: 1.5,
        filter: "blur(20px)",
      }, "-=0.8")
      .from(".description", {
        y: 20,
        opacity: 0,
        duration: 0.8,
      }, "-=0.6")
      .from(".action-button", {
        y: 20,
        opacity: 0,
        duration: 0.8,
      }, "-=0.4");

    // Float animation for the 404 text
    gsap.to(".error-code", {
      y: -20,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, { scope: contentRef });

  if (is404) {
    return (
      <Box
        ref={contentRef}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <FloatingBackground />
        <Container size="sm" style={{ position: "relative", zIndex: 10 }}>
          <Stack align="center" gap="xl">
            <Text
              className="error-code"
              style={{
                fontSize: "clamp(120px, 20vw, 240px)",
                fontWeight: 900,
                lineHeight: 1,
                fontFamily: "Outfit, sans-serif",
                background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                position: "absolute",
                zIndex: -1,
                userSelect: "none",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "100%",
                textAlign: "center"
              }}
            >
              404
            </Text>

            <Title
              ref={titleRef}
              order={1}
              style={{
                fontSize: "clamp(40px, 8vw, 80px)",
                fontWeight: 800,
                textAlign: "center",
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
              }}
            >
              Lost in the <br />
              <Text
                span
                inherit
                style={{
                  background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Digital Void
              </Text>
            </Title>

            <Text
              className="description"
              size="xl"
              c="dimmed"
              style={{ textAlign: "center", maxWidth: 400, opacity: 0.8 }}
            >
              The page you are looking for has been swallowed by the void. Let's get you back to safety.
            </Text>

            <Box className="action-button">
              <Button
                component="a"
                href="/"
                size="xl"
                radius="xl"
                leftSection={<MoveLeft size={20} />}
                variant="gradient"
                gradient={{ from: "violet", to: "pink", deg: 135 }}
                style={{
                  height: 60,
                  paddingLeft: 30,
                  paddingRight: 35,
                  fontSize: 18,
                  boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.4)"
                }}
              >
                Go Back Home
              </Button>
            </Box>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container size="sm">
        <Stack align="center">
          <Title order={1}>Internal Error</Title>
          <Text c="dimmed">Something went wrong on our end. Please try again later.</Text>
          <Button component="a" href="/" variant="light" color="violet">
            Go Home
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
