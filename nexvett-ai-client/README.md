# NexVett AI Client

Frontend client for the NexVett AI Bank Transaction Analyzer, built with React, Vike, and Mantine.

## 🚀 Quick Start

### Installation

Use the automated installation script in the root directory to set up both backend and client:

```bash
# Linux/macOS
cd .. && chmod +x install.sh && ./install.sh

# Windows
cd .. && install.bat
```

### Manual Setup

If you prefer manual setup:

```bash
# Install dependencies
pnpm install

# Start development server (Port 3000)
pnpm dev
```

## 📦 Features

- **Privacy-First Architecture**: Only aggregated summaries are persisted to enable your personal Financial Assistant, while raw bank statement data remains strictly transient and is never stored.
- **Multi-Format Support**: Support for PDF, Excel (XLS/XLSX), and CSV parsing.
- **Multi-File Analysis**: Combined, Separate, and Comparison modes for multiple statements.
- **Real-time AI Chat**: Instant transaction insights and conversational analysis.
- **Premium UI**: Dark mode, glassmorphism, and fluid animations via Mantine and GSAP.
- **Responsive Design**: Optimized for both desktop and mobile viewing.

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Modern, reactive frontend architecture.
- **Styling**: Advanced UI component library with modular styling.
- **Animations**: Fluid, cinema-grade interface transitions.
- **State Management**: Secure session and state synchronization.

### Key Components
- **Unified Portal**: Seamless multi-format data intake.
- **Intelligence Dashboard**: Dynamic visualizations and financial clarity modules.
- **Interactive Assistant**: Real-time, context-aware conversational interface.

## 🔗 Integration

This client connects to the Mastra backend server running on `http://localhost:4111`. The backend provides:

- Transaction analysis and categorization.
- AI-powered insights (Mistral Medium).
- Multi-file pattern recognition.
- Secure, in-memory file processing.

## 📁 Project Structure

```
nexvett-ai-client/
├── components/          # Reusable React components
├── pages/              # Vike page routes (+Page.tsx)
├── contexts/           # Session and State providers
└── assets/             # Static assets (logos, etc.)
```

## 🌐 Development

### Starting the Client
```bash
pnpm dev
```
The client will run on `http://localhost:3000`. Ensure the backend is running on `http://localhost:4111`.

### Building for Production
```bash
pnpm build
pnpm preview
```

## 📄 License

This project is licensed under the [Apache 2.0](../LICENSE).

**For commercial use, contact:** info@nexhublabs.com

---

**Built with ❤️ by Nexhub Labs**
