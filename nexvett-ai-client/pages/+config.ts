import type { Config } from "vike/types";
import vikeReact from "vike-react/config";

// Default config (can be overridden by pages)
// https://vike.dev/config

export default {
  // https://vike.dev/head-tags
  title: "NexVett AI - Privacy-First Bank Statement Analysis",
  description: "Securely analyze your Nigerian bank statements with NexVett AI. Zero storage, in-memory processing, and actionable financial insights.",

  extends: [vikeReact],
  ssr: false,
  passToClient: ["user"],
} satisfies Config;
