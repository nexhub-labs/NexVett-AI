# NexVett AI Backend

The core intelligence and analysis engine for NexVett AI, powered by Mastra.

## 🛡️ Privacy-First Philosophy

NexVett AI is designed with a **Privacy-First** architecture. Unlike traditional financial apps, we prioritize your data sovereignty:
- **Transient Transactions**: Raw bank statement data is processed and discarded. We do not store your full transaction history.
- **Aggregated Insights**: Only anonymized, aggregated summaries (totals, categories, trends) are persisted to enable your personal Financial Assistant.
- **Data Sovereignty**: Your data is yours. We use these summaries to provide month-over-month trends and proactive budgeting advice without keeping a permanent copy of your most sensitive financial records.

## 🚀 Quick Start

### Installation

Use the automated installation script in the root directory:

```bash
# Windows (from root)
install.bat
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Start development server (Port 4111)
pnpm dev
```

## 🏗️ Architecture

- **Framework**: Powered by high-performance AI orchestration.
- **Engine**: Robust, low-latency API architecture.
- **Agents**: 
  - Specialized financial analysis models.
  - Advanced structural extraction engines.
- **Analyzers**: Proprietary logic for classification, pattern recognition, and anomaly detection.

## 🔗 APIs

The backend exposes several Hono-based routes:

- `POST /chat`: Multi-turn conversational analysis.
- `POST /parse-file`: Single file extraction.
- `POST /analyze-multi-file`: Multi-file pattern analysis.

## 📂 Project Structure

```
nexvett-ai/
├── src/
│   └── mastra/
│       ├── agents/         # AI Agent definitions
│       ├── analyzers/      # Transaction processing logic
│       ├── api/            # Backend API routes
│       ├── parsers/        # File extraction (PDF/XLSX/CSV)
│       └── index.ts        # Mastra configuration
├── package.json
└── README.md
```

## 📄 License

This project is licensed under the [Apache 2.0 License](../LICENSE).

---

**Built by Nexhub Labs**
