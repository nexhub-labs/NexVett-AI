// https://vike.dev/Layout

import "@mantine/core/styles.css";
import logoUrl from "../assets/logo.webp";
import type { MantineThemeOverride } from "@mantine/core";
import { useRef, useEffect, useState } from "react";
import { Anchor, AppShell, Box, Container, createTheme, Group, Image, MantineProvider, Text, Button, Transition, Burger, Drawer, Stack, Menu, Avatar, rem } from "@mantine/core";
import { LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@mantine/hooks";
import { SessionProvider, useSession } from "../contexts/SessionContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { AIAssistantModal } from "../components/Chat/AIAssistantModal";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";

gsap.registerPlugin(useGSAP);

const theme: MantineThemeOverride = createTheme({
  primaryColor: "violet",
  fontFamily: "Inter, sans-serif",
  headings: {
    fontFamily: "Outfit, sans-serif",
    fontWeight: "700",
  },
  black: "#0B0B10",
  defaultRadius: "lg",
  radius: { xs: "10px", sm: "12px", md: "14px", lg: "18px", xl: "22px" },
  spacing: { xs: "0.75rem", sm: "1rem", md: "1.25rem", lg: "1.75rem", xl: "2.25rem" },
  shadows: {
    xs: "0 2px 4px rgba(0,0,0,0.12)",
    sm: "0 12px 42px rgba(0,0,0,0.48), 0 0 1px rgba(124, 58, 237, 0.2)",
    md: "0 18px 70px rgba(0,0,0,0.64), 0 0 2px rgba(124, 58, 237, 0.3)",
    lg: "0 26px 90px rgba(0,0,0,0.72), 0 0 3px rgba(124, 58, 237, 0.4)",
    xl: "0 34px 120px rgba(0,0,0,0.80), 0 0 4px rgba(124, 58, 237, 0.5)",
  },
  components: {
    Container: {
      defaultProps: { size: "lg" },
    },
    Button: {
      defaultProps: { radius: "xl" },
      styles: {
        root: {
          fontWeight: 700,
          letterSpacing: "-0.01em",
          borderColor: "rgba(255,255,255,0.20)",
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 12px 32px rgba(124, 58, 237, 0.35)",
          },
        },
      },
    },
    Paper: {
      defaultProps: { radius: "lg" },
      styles: {
        root: {
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
        },
      },
    },
  },
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { is404 } = usePageContext();
  const [opened, setOpened] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [isSignPage, setIsSignPage] = useState(false);
  const [isChatPage, setIsChatPage] = useState(false);

  useEffect(() => {
    const checkPath = () => {
      setIsChatPage(window.location.pathname === "/chat");
      setIsSignPage(window.location.pathname === "/signin");
    };
    checkPath();
    window.addEventListener("popstate", checkPath);
    const interval = setInterval(checkPath, 500);
    return () => {
      window.removeEventListener("popstate", checkPath);
      clearInterval(interval);
    };
  }, []);

  useGSAP(() => {
    if (reducedMotion) return;
    gsap.from(headerRef.current, {
      y: -20,
      opacity: 0,
      duration: 1,
      ease: "power4.out",
      clearProps: "transform,opacity"
    });
  }, { scope: headerRef });

  const { user } = useAuth();

  const navLinks = [
    ...(user ? [{ label: "Analyze", href: "/analyze" }] : []),
    { label: "Reviews", href: "/reviews" },
    { label: "Home", href: "/" }
  ];

  return (
    <Box
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(1200px 600px at 10% -5%, rgba(124, 58, 227, 0.22), transparent 60%), radial-gradient(900px 450px at 90% 10%, rgba(236, 72, 153, 0.16), transparent 55%), radial-gradient(1000px 500px at 50% 110%, rgba(14, 165, 233, 0.14), transparent 60%), #07070A",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <Box
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.035,
          mixBlendMode: "overlay",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0, rgba(255,255,255,0.045) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 4px), repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0, rgba(0,0,0,0.16) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px)",
        }}
      />

      <style>
        {`
              body {
                overflow: ${isChatPage ? 'hidden' : 'auto'};
              }
            `}
      </style>

      {!is404 && !isSignPage && <ChatFloatingButton />}
      {!is404 && !isSignPage && <AIAssistantModal />}

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        size="100%"
        padding="xl"
        title={
          <Group gap="xs">
            <Image h={28} src={logoUrl} />
            <Text fw={800} size="lg" style={{ fontFamily: "Outfit, sans-serif" }}>
              NexVett <Text span c="violet.5">AI</Text>
            </Text>
          </Group>
        }
        styles={{
          content: { background: "rgba(7, 7, 10, 0.95)", backdropFilter: "blur(20px)" },
          header: { background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 20 },
        }}
      >
        <Stack gap="xl" mt={40}>
          {navLinks.map((item, i) => (
            <Anchor
              key={i}
              href={item.href}
              onClick={() => setOpened(false)}
              size="xl"
              fw={700}
              c="white"
              underline="never"
              style={{
                fontSize: 32,
                letterSpacing: "-0.04em",
                fontFamily: "Outfit, sans-serif"
              }}
            >
              {item.label}
            </Anchor>
          ))}

          <AuthButton onAction={() => setOpened(false)} mobile />

          <Button
            size="xl"
            radius="xl"
            fullWidth
            mt="xl"
            style={{ height: 64, fontSize: 18 }}
            onClick={() => {
              setOpened(false);
              navigate("/analyze");
            }}
          >
            Start Analysis
          </Button>
        </Stack>
      </Drawer>

      <AppShell header={(!is404 && !isSignPage) ? { height: 76 } : undefined} padding={0}>
        {!is404 && !isSignPage && (
          <AppShell.Header
            ref={headerRef}
            style={{
              background: "rgba(11, 11, 16, 0.45)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <Container size="lg" h="100%">
              <Group h="100%" justify="space-between" wrap="nowrap">
                <Group gap="xs">
                  <a href="/" style={{ display: "inline-flex", alignItems: "center" }}>
                    <Image h={32} w="auto" fit="contain" src={logoUrl} />
                  </a>
                  <Text fw={800} size="lg" style={{ letterSpacing: "-0.03em", fontFamily: "Outfit, sans-serif" }}>
                    NexVett <Text span style={{
                      background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}>AI</Text>
                  </Text>
                </Group>

                {/* Desktop Nav */}
                <Group gap={32} visibleFrom="sm">
                  {navLinks.filter(l => l.label !== "Home").map((link, i) => (
                    <Anchor
                      key={i}
                      href={link.href}
                      c="gray.0"
                      underline="never"
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: 0.7,
                        transition: "opacity 0.2s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                    >
                      {link.label}
                    </Anchor>
                  ))}
                  <AuthButton />
                </Group>

                {/* Mobile Trigger */}
                <Burger
                  opened={opened}
                  onClick={() => setOpened(true)}
                  hiddenFrom="sm"
                  size="sm"
                  color="white"
                />
              </Group>
            </Container>
          </AppShell.Header>
        )}

        <AppShell.Main>
          <Container
            size="lg"
            py={is404 ? 0 : "xl"}
            style={{
              position: "relative",
              zIndex: 1,
              minHeight: is404 ? "100vh" : "calc(100vh - 76px)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: isSignPage ? 'center' : 'stretch' }}>
              {children}
            </Box>

            {!isChatPage && !is404 && !isSignPage && (
              <Box component="footer" mt={80} py="xl" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                  <Box>
                    <Text fw={800} size="lg" style={{ letterSpacing: "-0.02em" }}>
                      NexVett <Text span c="violet.5">AI</Text>
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      Privacy-first bank statement signal.
                    </Text>
                  </Box>
                  <Group gap="xl">
                    <Anchor href="/" size="xs" c="dimmed" underline="never" style={{ opacity: 0.7 }}>Home</Anchor>
                    <Anchor href="/analyze" size="xs" c="dimmed" underline="never" style={{ opacity: 0.7 }}>Analyze</Anchor>
                    <Anchor href="/reviews" size="xs" c="dimmed" underline="never" style={{ opacity: 0.7 }}>Reviews</Anchor>
                    <Text size="xs" c="dimmed" style={{ cursor: "pointer", opacity: 0.7 }}>Privacy</Text>
                    <Text size="xs" c="dimmed" style={{ cursor: "pointer", opacity: 0.7 }}>Contact</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    © {new Date().getFullYear()} Nexhub Labs.
                  </Text>
                </Group>
              </Box>
            )}
          </Container>
        </AppShell.Main>
      </AppShell>
    </Box>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SessionProvider>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <LayoutContent>{children}</LayoutContent>
        </MantineProvider>
      </SessionProvider>
    </AuthProvider>
  );
}

function AuthButton({ mobile, onAction }: { mobile?: boolean; onAction?: () => void }) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    if (onAction) onAction();
  };

  if (user) {
    if (mobile) {
      return (
        <Group gap="sm" wrap="wrap">
          <Text fw={700} size="lg" c="violet.3">{user.email}</Text>
          <Button
            variant="light"
            color="violet"
            size="md"
            radius="xl"
            leftSection={<LayoutDashboard size={18} />}
            onClick={() => {
              if (onAction) onAction();
              navigate("/dashboard");
            }}
            fullWidth
          >
            Dashboard
          </Button>
          <Button
            variant="light"
            color="red"
            size="md"
            radius="xl"
            onClick={handleSignOut}
            fullWidth
            leftSection={<LogOut size={18} />}
          >
            Sign Out
          </Button>
        </Group>
      );
    }

    return (
      <Menu shadow="md" width={200} position="bottom-end" radius="md">
        <Menu.Target>
          <Button
            variant="subtle"
            color="gray"
            radius="xl"
            size="sm"
            style={{ paddingLeft: 8, paddingRight: 16 }}
            rightSection={<ChevronDown size={14} />}
          >
            <Group gap="xs">
              <Avatar color="violet" radius="xl" size={26}>
                {user.email?.charAt(0).toUpperCase()}
              </Avatar>
              <Text size="sm" fw={600} visibleFrom="sm">{user.email?.split('@')[0]}</Text>
            </Group>
          </Button>
        </Menu.Target>

        <Menu.Dropdown style={{ background: "rgba(11, 11, 16, 0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Menu.Label>My Account</Menu.Label>
          <Menu.Item
            leftSection={<LayoutDashboard style={{ width: rem(14), height: rem(14) }} />}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item
            color="red"
            leftSection={<LogOut style={{ width: rem(14), height: rem(14) }} />}
            onClick={handleSignOut}
          >
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Button
      variant="light"
      color="violet"
      size={mobile ? "md" : "xs"}
      radius="xl"
      px="xl"
      onClick={() => {
        if (onAction) onAction();
        navigate("/signin");
      }}
      fullWidth={mobile}
    >
      Sign In
    </Button>
  );
}

function ChatFloatingButton() {
  const { setIsChatOpen } = useSession();
  const scope = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkPath = () => {
      setVisible(window.location.pathname !== "/chat");
    };

    checkPath();
    window.addEventListener("popstate", checkPath);
    const interval = setInterval(checkPath, 1000);

    return () => {
      window.removeEventListener("popstate", checkPath);
      clearInterval(interval);
    };
  }, []);

  useGSAP(
    () => {
      // Magnetic interactions removed for absolute UI stability
    },
    { scope, dependencies: [visible] }
  );

  if (!visible) return null;

  return (
    <Box
      ref={scope}
      style={{
        position: "fixed",
        bottom: 30,
        right: 30,
        zIndex: 1000,
      }}
    >
      <Button
        onClick={() => setIsChatOpen(true)}
        size="lg"
        radius="100%"
        variant="default"
        style={{
          width: 56,
          height: 56,
          padding: 0,
          background: "rgba(11, 11, 16, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "2px solid",
          borderImageSource: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
          borderImageSlice: 1,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(139, 92, 246, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}
      >
        <Text
          fw={900}
          size="sm"
          style={{
            fontFamily: "Outfit, sans-serif",
            background: "linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.05em"
          }}
        >
          AI
        </Text>
      </Button>
    </Box>
  );
}
